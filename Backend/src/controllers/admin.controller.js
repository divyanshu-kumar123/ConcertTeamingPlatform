const mongoose = require('mongoose'); 
const exceljs = require('exceljs');
const { User, Team, SeatingGroup } = require('../models');
// @desc    Get all teams, solo employees, and seating capacities
// @route   GET /api/admin/dashboard
// @access  Private (Admin Only)
exports.getAdminDashboard = async (req, res) => {
  try {
    // 1. Get seating groups
    const seatingGroups = await SeatingGroup.find().sort({ name: 1 });

    // 2. SCALABLE AGGREGATION: Get teams sorted by size
    // We use aggregation to count members and sort at the DB level
    const teams = await Team.aggregate([
      {
        $lookup: {
          from: 'users', // Collection name for members
          localField: 'members',
          foreignField: '_id',
          as: 'memberDetails'
        }
      },
      {
        $lookup: {
          from: 'seatinggroups',
          localField: 'seatingGroupId',
          foreignField: '_id',
          as: 'groupDetails'
        }
      },
      {
        $addFields: {
          memberCount: { $size: "$members" },
          seatingGroup: { $arrayElemAt: ["$groupDetails", 0] }
        }
      },
      { $sort: { memberCount: -1 } }, // Largest teams first
      {
        $project: {
          _id: 1,
          members: {
            $map: {
              input: "$memberDetails",
              as: "m",
              in: { name: "$$m.name", sapId: "$$m.sapId", _id: "$$m._id" }
            }
          },
          seatingGroupId: "$seatingGroup"
        }
      }
    ]);

    // 3. Get solo employees
    const soloEmployees = await User.find({ teamId: null, role: 'EMPLOYEE', isVerified: true })
      .select('name sapId seatingGroupId')
      .populate('seatingGroupId', 'name');

    res.status(200).json({
      seatingGroups,
      teams,
      soloEmployees,
      summary: {
        totalTeams: teams.length,
        totalSoloEmployees: soloEmployees.length
      }
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ message: 'Server error loading admin dashboard.' });
  }
};

// @desc    Manually assign a team to a seating group
// @route   POST /api/admin/assign-team
// @access  Private (Admin Only)
exports.assignTeamToGroup = async (req, res) => {
  try {
    const { teamId, seatingGroupId } = req.body;

    if (!teamId || !seatingGroupId) {
      return res.status(400).json({ message: 'Please provide both Team ID and Seating Group ID.' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    const newGroup = await SeatingGroup.findById(seatingGroupId);
    if (!newGroup) {
      return res.status(404).json({ message: 'Seating Group not found.' });
    }

    // Check if the team is already in a group. If so, we need to free up those old seats first!
    if (team.seatingGroupId) {
      const oldGroup = await SeatingGroup.findById(team.seatingGroupId);
      if (oldGroup) {
        oldGroup.allocatedCount -= team.members.length;
        await oldGroup.save();
      }
    }

    // Check if the new group has enough capacity for this team
    const availableSeats = newGroup.capacity - newGroup.allocatedCount;
    if (availableSeats < team.members.length) {
      return res.status(400).json({ 
        message: `Not enough seats in Group ${newGroup.name}. Required: ${team.members.length}, Available: ${availableSeats}` 
      });
    }

    // Allocate the seats!
    newGroup.allocatedCount += team.members.length;
    await newGroup.save();

    team.seatingGroupId = newGroup._id;
    await team.save();

    // Optionally: Update all users in that team to reflect their new seating group
    await User.updateMany(
      { _id: { $in: team.members } },
      { $set: { seatingGroupId: newGroup._id } }
    );

    res.status(200).json({ message: `Team successfully assigned to Group ${newGroup.name}.` });
  } catch (error) {
    console.error('Assign Team Error:', error);
    res.status(500).json({ message: 'Server error assigning team to seating group.' });
  }
};


// @desc    Auto-allocate all unassigned teams and solo employees
// @route   POST /api/admin/auto-allocate
// @access  Private (Admin Only)
exports.autoAllocateSeats = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch all seating groups
    const groups = await SeatingGroup.find().session(session);
    
    // 2. Fetch all unassigned teams
    const teams = await Team.find({ seatingGroupId: null }).session(session);
    
    // Sort teams by size descending (largest teams get seated first to prevent fragmentation)
    teams.sort((a, b) => b.members.length - a.members.length);

    let allocatedTeamsCount = 0;

    // 3. Allocate Teams
    for (const team of teams) {
      const teamSize = team.members.length;
      
      // Find the first group that has enough remaining capacity
      const fittingGroup = groups.find(g => (g.capacity - g.allocatedCount) >= teamSize);

      if (fittingGroup) {
        // Deduct capacity and assign
        fittingGroup.allocatedCount += teamSize;
        team.seatingGroupId = fittingGroup._id;
        await team.save({ session });
        
        // Update the users inside the team
        await User.updateMany(
          { _id: { $in: team.members } },
          { $set: { seatingGroupId: fittingGroup._id } },
          { session }
        );
        allocatedTeamsCount++;
      }
    }

    // 4. Fetch and Allocate Solo Employees (no team, no seating group yet)
    const soloUsers = await User.find({ 
      teamId: null, 
      seatingGroupId: null, 
      role: 'EMPLOYEE', 
      isVerified: true 
    }).session(session);

    let allocatedSoloCount = 0;

    for (const user of soloUsers) {
      const fittingGroup = groups.find(g => (g.capacity - g.allocatedCount) >= 1);
      
      if (fittingGroup) {
        fittingGroup.allocatedCount += 1;
        user.seatingGroupId = fittingGroup._id;
        await user.save({ session });
        allocatedSoloCount++;
      }
    }

    // 5. Save the updated group capacities
    for (const group of groups) {
      await group.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Intelligent Auto-Allocation Complete!',
      metrics: {
        teamsAllocated: allocatedTeamsCount,
        soloUsersAllocated: allocatedSoloCount,
        teamsLeftUnassigned: teams.length - allocatedTeamsCount,
        soloUsersLeftUnassigned: soloUsers.length - allocatedSoloCount
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Auto Allocate Error:', error);
    res.status(500).json({ message: 'Server error during auto allocation.' });
  }
};

// @desc    Export final seating arrangement to Excel
// @route   GET /api/admin/export
// @access  Private (Admin Only)
exports.exportSeatingData = async (req, res) => {
  try {
    // Get all verified employees populated with their seating group
    const employees = await User.find({ role: 'EMPLOYEE', isVerified: true })
      .populate('seatingGroupId', 'name')
      .sort({ sapId: 1 }); // Sort alphabetically by SAP ID

    // Initialize a new Workbook and Worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Seating Arrangement');

    // Define columns
    worksheet.columns = [
      { header: 'SAP ID', key: 'sapId', width: 15 },
      { header: 'Employee Name', key: 'name', width: 30 },
      { header: 'Team ID', key: 'teamId', width: 30 },
      { header: 'Seating Group', key: 'group', width: 15 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Add data rows
    employees.forEach(emp => {
      worksheet.addRow({
        sapId: emp.sapId,
        name: emp.name,
        teamId: emp.teamId ? emp.teamId.toString() : 'SOLO',
        group: emp.seatingGroupId ? `Group ${emp.seatingGroupId.name}` : 'UNASSIGNED'
      });
    });

    // Set headers to trigger a file download in the browser
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Event_Seating_Arrangement.xlsx"');

    // Write the workbook to the response stream
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ message: 'Server error generating Excel file.' });
  }
};


// @desc    Get detailed occupancy for a specific seating group
// @route   GET /api/admin/groups/:id/occupants
// @access  Private (Admin Only)
exports.getGroupOccupants = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Teams in this group
    const teams = await Team.find({ seatingGroupId: id })
      .populate('members', 'name sapId');

    // 2. Get Solo Employees in this group
    const soloEmployees = await User.find({ 
      seatingGroupId: id, 
      teamId: null, 
      role: 'EMPLOYEE' 
    }).select('name sapId');

    res.status(200).json({
      teams,
      soloEmployees,
      totalCount: (teams.reduce((acc, t) => acc + t.members.length, 0)) + soloEmployees.length
    });
  } catch (error) {
    console.error('Group Occupants Error:', error);
    res.status(500).json({ message: 'Error fetching group details.' });
  }
};