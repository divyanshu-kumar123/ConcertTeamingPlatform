import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* We will add our React Router setup here next! */}
      <h1 className="text-3xl font-bold text-center mt-10 text-blue-600">
        Frontend Setup Complete!
      </h1>
      
      {/* This component allows toasts to render anywhere in the app */}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;