import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import axiosInstance from '../api/axiosInstance';
import { Plus, Layout, FolderPlus, Users } from 'lucide-react';

export const DashboardPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const [showBoardModal, setShowBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardBg, setNewBoardBg] = useState('#0079BF');

  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/workspaces');
      const wsList = res.data.workspaces || [];
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        // Keep current selected workspace if valid, or default to first
        setSelectedWorkspace((prev) => {
          if (prev) {
            const found = wsList.find((w) => w._id === prev._id);
            if (found) return found;
          }
          return wsList[0];
        });
      } else {
        // Auto-create default workspace if user has none
        const createRes = await axiosInstance.post('/workspaces', { name: 'My Workspace' });
        setWorkspaces([createRes.data.workspace]);
        setSelectedWorkspace(createRes.data.workspace);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceBoards = async (wsId) => {
    if (!wsId) return;
    try {
      const res = await axiosInstance.get(`/workspaces/${wsId}`);
      setBoards(res.data.boards || []);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  };

  const handleRefreshAll = () => {
    fetchWorkspaces();
    if (selectedWorkspace) {
      fetchWorkspaceBoards(selectedWorkspace._id);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchWorkspaceBoards(selectedWorkspace._id);
    }
  }, [selectedWorkspace]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const res = await axiosInstance.post('/workspaces', { name: newWsName });
      setWorkspaces((prev) => [...prev, res.data.workspace]);
      setSelectedWorkspace(res.data.workspace);
      setNewWsName('');
      setShowWorkspaceModal(false);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim() || !selectedWorkspace) return;
    try {
      const res = await axiosInstance.post('/boards', {
        title: newBoardTitle,
        workspaceId: selectedWorkspace._id,
        background: newBoardBg,
      });
      setBoards((prev) => [...prev, res.data.board]);
      setNewBoardTitle('');
      setShowBoardModal(false);
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Dashboard" onRefreshData={handleRefreshAll} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar: Workspaces */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Workspaces</h2>
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 transition"
              title="Create Workspace"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws._id}
                onClick={() => setSelectedWorkspace(ws)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  selectedWorkspace?._id === ws._id
                    ? 'bg-brand-50 text-brand-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="w-7 h-7 rounded bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                  {ws.name[0].toUpperCase()}
                </div>
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Boards Grid */}
        <div className="md:col-span-3 space-y-6">
          {selectedWorkspace && (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedWorkspace.name}</h1>
                  <p className="text-sm text-gray-500">Collaborative Boards</p>
                </div>
                <button
                  onClick={() => setShowBoardModal(true)}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow flex items-center space-x-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Board</span>
                </button>
              </div>

              {/* Boards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boards.map((board) => (
                  <div
                    key={board._id}
                    onClick={() => navigate(`/board/${board._id}`)}
                    className="h-32 rounded-xl p-4 cursor-pointer hover:shadow-lg transition transform hover:-translate-y-0.5 flex flex-col justify-between text-white font-bold text-lg relative overflow-hidden shadow-sm"
                    style={{ backgroundColor: board.background || '#0079BF' }}
                  >
                    <span>{board.title}</span>
                    <div className="flex justify-end">
                      <Layout className="w-5 h-5 opacity-70" />
                    </div>
                  </div>
                ))}

                {/* Create Board Card Button */}
                <button
                  onClick={() => setShowBoardModal(true)}
                  className="h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-500 bg-white hover:bg-brand-50/50 flex flex-col items-center justify-center space-y-2 text-gray-500 hover:text-brand-600 transition font-medium text-sm"
                >
                  <Plus className="w-6 h-6" />
                  <span>Create new board</span>
                </button>
              </div>
            </>
          )}
        </div>

      </main>

      {/* Modal: Create Workspace */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateWorkspace} className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Create New Workspace</h3>
            <input
              type="text"
              required
              autoFocus
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Workspace Name (e.g. Engineering)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowWorkspaceModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Board */}
      {showBoardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateBoard} className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Create Board</h3>
            <input
              type="text"
              required
              autoFocus
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              placeholder="Board Title (e.g. Sprint 1)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">Background Color</label>
              <div className="flex space-x-2">
                {['#0079BF', '#D29034', '#51E898', '#EB5A46', '#FF78CB', '#344563'].map((bg) => (
                  <button
                    type="button"
                    key={bg}
                    onClick={() => setNewBoardBg(bg)}
                    className={`w-8 h-8 rounded-full transition transform ${
                      newBoardBg === bg ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: bg }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBoardModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow"
              >
                Create Board
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
