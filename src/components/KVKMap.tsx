import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface KVKLocation {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distance?: number;
}

interface KVKMapProps {
  kvks: KVKLocation[];
  userLocation: { lat: number; lng: number } | null;
  onKVKSelect: (kvkId: string) => void;
}

const KVKMap: React.FC<KVKMapProps> = ({ kvks, userLocation, onKVKSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is a simple visual representation
    // In a real implementation, you would integrate with Google Maps or Leaflet
    console.log('Map would show KVKs:', kvks);
    console.log('User location:', userLocation);
  }, [kvks, userLocation]);

  return (
    <div ref={mapRef} className="relative w-full h-96 bg-gradient-to-br from-green-100 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Interactive Map View
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This would show an interactive map with KVK locations
          </p>
          <div className="space-y-2">
            {userLocation && (
              <div className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                Your Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </div>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {kvks.length} KVK centers nearby
            </div>
          </div>
        </div>
      </div>
      
      {/* Simple visual indicators for KVKs */}
      <div className="absolute top-4 left-4 space-y-2">
        {kvks.slice(0, 3).map((kvk, index) => (
          <button
            key={kvk.id}
            onClick={() => onKVKSelect(kvk.id)}
            className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="font-medium">{kvk.name}</span>
            {kvk.distance && (
              <span className="text-gray-500">({kvk.distance.toFixed(1)} km)</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default KVKMap;