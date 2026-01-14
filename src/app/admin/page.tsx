import { Upload, Image, Calendar, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <a
          href="/admin/media/upload"
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Medien hochladen</h3>
              <p className="text-sm text-gray-500">Bilder & Videos</p>
            </div>
          </div>
        </a>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Image size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Galerie</h3>
              <p className="text-sm text-gray-500">Bald verfügbar</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Buchungen</h3>
              <p className="text-sm text-gray-500">Bald verfügbar</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Bewertungen</h3>
              <p className="text-sm text-gray-500">Bald verfügbar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
