'use client';

import { useState } from 'react';

const RouteEditor = ({ onCalculateRoute }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCalculateRoute(origin, destination);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al calcular la ruta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <form onSubmit={handleCalculate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Origen</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Destino</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Calculando...' : 'Calcular Ruta'}
        </button>
      </form>
    </div>
  );
};

export default RouteEditor;