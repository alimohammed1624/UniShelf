'use client';

import { useState } from 'react';
import { Resource } from '@/types';
import { useResources } from '@/hooks/useResources';

export default function Dashboard() {
  const { 
    resources, 
    loading, 
    file, 
    setFile, 
    fileInputRef, 
    uploadResource, 
    downloadResource, 
    removeFile, 
    logout 
  } = useResources();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const success = await uploadResource(title, description);
    if (success) {
      setTitle('');
      setDescription('');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">UniShelf Dashboard</h1>
          <button
            onClick={handleLogoutClick}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Logout
          </button>
        </div>
        
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg max-w-sm">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Confirm Logout</h2>
              <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Resource</h2>
          <form onSubmit={handleUpload}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">File</label>
              <div className="flex items-center gap-4">
                {file ? (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded cursor-pointer focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                  >
                    Remove File
                  </button>
                ) : (
                  <label 
                    htmlFor="file" 
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                  >
                    Choose File
                  </label>
                )}
                <span className="text-gray-600 text-sm">
                  {file ? file.name : 'No file chosen'}
                </span>
                <input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Upload
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Available Resources</h2>
          {resources.length === 0 ? (
            <p className="text-gray-500">No resources found.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {resources.map((resource) => (
                <li key={resource.id} className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{resource.title}</h3>
                      <p className="text-gray-600">{resource.description}</p>
                      <p className="text-sm text-gray-500 mt-1">Uploaded by User #{resource.uploader_id}</p>
                    </div>
                    <button
                      onClick={() => downloadResource(resource.id, resource.title)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-4"
                    >
                      Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
