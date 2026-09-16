import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import ChatArea from './components/ChatArea';
import Toast from './components/Toast';
import WorkspacePanel from './components/WorkspacePanel';
import ProjectDetailView from './components/ProjectDetailView';
import CreateProjectModal from './components/CreateProjectModal';
import GitPanel from './components/GitPanel';
import SettingsModal from './components/SettingsModal';
import DocSurfaceContainer from './components/doc-surface/DocSurfaceContainer';
import { INITIAL_MOCK_MESSAGES } from './components/ChatMode';
import {
  getWorkspaceStatus,
  getSavedActiveWorkspace,
  openWorkspace,
  getSavedWorkspaces,
  saveWorkspaceToList,
  addProjectChat,
  updateProjectChat,
  deleteProjectChat,
  moveChatToProject,
  generateChatTitle
} from './services/workspaceService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          color: '#ececec',
          backgroundColor: '#1a1a1a',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '28px', marginBottom: '12px', color: '#d97757' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#8e8e8e', fontSize: '14px', marginBottom: '20px', maxWidth: '500px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 18px',
              backgroundColor: '#2a2a2a',
              color: '#ececec',
              border: '1px solid #333333',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState('workspace'); // default to 'workspace' per user request
  const [messages, setMessages] = useState(INITIAL_MOCK_MESSAGES);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Sync with engine or restore saved workspace on startup
  useEffect(() => {
    const list = getSavedWorkspaces();
    setAllProjects(list);

    getWorkspaceStatus().then(async (res) => {
      if (res.success && res.data?.id) {
        setActiveWorkspace(res.data);
      } else {
        const saved = getSavedActiveWorkspace();
        if (saved?.rootPath) {
          setActiveWorkspace(saved);
          try {
            const openRes = await openWorkspace(saved.rootPath);
            if (openRes.success && openRes.data) {
              setActiveWorkspace({
                ...saved,
                ...openRes.data
              });
            }
          } catch (e) {
            console.warn('Auto-reconnect workspace on startup failed:', e);
          }
        }
      }
    });
  }, []);

  const showToast = (message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ visible: true, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  const closeToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Open an existing chat session from recents list
  const handleOpenChat = (chat) => {
    setSelectedChat(chat);
    if (chat.messages && chat.messages.length > 0) {
      const normalized = chat.messages.map((m) => ({
        ...m,
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.content ?? m.text ?? ''
      }));
      setMessages(normalized);
    } else {
      setMessages([
        {
          id: `seed-${Date.now()}`,
          role: 'assistant',
          content: `Loaded conversation **${chat.title}** for project **${selectedProject?.name || 'Workspace'}**. Ready for your next request!`,
          timestamp: chat.dateStr || 'Recent'
        }
      ]);
    }
    setCurrentView('chat');
  };

  // Create a new chat session with prompt typed in ProjectDetailView
  const handleNewChatWithPrompt = async (promptText) => {
    showToast('Starting conversation with Nemotron...');

    // 1. Generate 3-4 word AI title
    const aiTitle = await generateChatTitle(promptText);

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newChatObj = {
      id: `chat-${Date.now()}`,
      title: aiTitle,
      dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pinned: false,
      messages: [userMessage]
    };

    const currentProj = selectedProject || activeWorkspace;
    if (currentProj) {
      const { newChat } = addProjectChat(currentProj.id, newChatObj);
      setSelectedChat(newChat);

      const updated = {
        ...currentProj,
        chats: [newChat, ...(currentProj.chats || [])]
      };
      setSelectedProject(updated);
      if (activeWorkspace?.id === currentProj.id) {
        setActiveWorkspace(updated);
      }
      setAllProjects(getSavedWorkspaces());
    }

    setMessages([userMessage]);
    setPendingPrompt(promptText);
    setCurrentView('chat');
  };

  // Sync conversation changes into project memory & localStorage
  useEffect(() => {
    const currentProj = selectedProject || activeWorkspace;
    if (selectedChat?.id && currentProj?.id && messages.length > 0) {
      updateProjectChat(currentProj.id, selectedChat.id, { messages });
      const updatedChats = (currentProj.chats || []).map((c) =>
        c.id === selectedChat.id ? { ...c, messages } : c
      );
      if (selectedProject) {
        setSelectedProject((prev) => prev ? { ...prev, chats: updatedChats } : prev);
      }
      if (activeWorkspace?.id === currentProj.id) {
        setActiveWorkspace((prev) => prev ? { ...prev, chats: updatedChats } : prev);
      }
      setAllProjects(getSavedWorkspaces());
    }
  }, [messages, selectedChat?.id]);

  // Handle moving a chat to another project
  const handleMoveChat = (chat, targetProjectId) => {
    const currentProj = selectedProject || activeWorkspace;
    if (currentProj) {
      moveChatToProject(currentProj.id, targetProjectId, chat.id);
      const updatedChats = (currentProj.chats || []).filter((c) => c.id !== chat.id);
      const updated = { ...currentProj, chats: updatedChats };
      setSelectedProject(updated);
      if (activeWorkspace?.id === currentProj.id) {
        setActiveWorkspace(updated);
      }
      setAllProjects(getSavedWorkspaces());
      showToast(`Moved "${chat.title}"`);
    }
  };

  // Handle deleting a chat
  const handleDeleteChat = (projectId, chatId) => {
    deleteProjectChat(projectId, chatId);
    const currentProj = selectedProject || activeWorkspace;
    if (currentProj && currentProj.id === projectId) {
      const updatedChats = (currentProj.chats || []).filter((c) => c.id !== chatId);
      const updated = { ...currentProj, chats: updatedChats };
      setSelectedProject(updated);
      if (activeWorkspace?.id === currentProj.id) {
        setActiveWorkspace(updated);
      }
      setAllProjects(getSavedWorkspaces());
    }
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
      setMessages(INITIAL_MOCK_MESSAGES);
    }
  };

  // Create project from modal
  const handleCreateProjectFromModal = async ({ name, description, rootPath }) => {
    let symbolCount = 0;
    let state = 'READY';

    if (rootPath) {
      const res = await openWorkspace(rootPath);
      if (res.success) {
        symbolCount = res.data?.symbolCount || 0;
      }
    }

    const newProject = {
      id: `ws-${Date.now()}`,
      name,
      description: description || (rootPath ? `Repository workspace at ${rootPath}` : 'Project workspace'),
      rootPath: rootPath || undefined,
      state,
      symbolCount,
      dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      chats: []
    };

    saveWorkspaceToList(newProject);
    setAllProjects(getSavedWorkspaces());
    setSelectedProject(newProject);
    setActiveWorkspace(newProject);
    setCurrentView('project-detail');
    showToast(`Project "${name}" created!`);
  };

  const isDocSurfaceView = currentView === 'diff' || currentView === 'graph';

  const allRecentSessions = (
    selectedProject?.chats?.length
      ? selectedProject.chats
      : allProjects.flatMap((p) => p.chats || [])
  ).slice(0, 10);

  const handleOpenRecentFromSidebar = (chat) => {
    const parentProj = allProjects.find((p) => (p.chats || []).some((c) => c.id === chat.id));
    if (parentProj) {
      setSelectedProject(parentProj);
    }
    handleOpenChat(chat);
  };

  return (
    <div className="app-shell">
      {/* Mobile drawer background overlay */}
      <div
        className="sidebar-overlay"
        aria-hidden="true"
        onClick={() => {
          const sidebar = document.getElementById('sidebar');
          const overlay = document.querySelector('.sidebar-overlay');
          sidebar?.classList.remove('open');
          overlay?.classList.remove('open');
        }}
      />

      {/* Primary Sidebar (System A) */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onToast={showToast}
        activeWorkspace={activeWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
        recentSessions={allRecentSessions}
        onSelectChat={handleOpenRecentFromSidebar}
      />

      {/* Main Surface Routing */}
      <ErrorBoundary>
        {isDocSurfaceView ? (
          /* System B Isolated Tree (.doc-surface) per Section 10.2 & 10.3 */
          <DocSurfaceContainer
            view={currentView}
            setCurrentView={setCurrentView}
            onToast={showToast}
            activeWorkspace={activeWorkspace}
          />
        ) : (
          /* System A Primary Shell */
          <div className="main-shell">
            <TopHeader
              currentView={currentView}
              setCurrentView={setCurrentView}
              onToast={showToast}
              activeWorkspace={activeWorkspace}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {currentView === 'workspace' ? (
              <WorkspacePanel
                activeWorkspace={activeWorkspace}
                setActiveWorkspace={setActiveWorkspace}
                setCurrentView={setCurrentView}
                onSelectProject={(proj) => {
                  setSelectedProject(proj);
                  setCurrentView('project-detail');
                }}
                onToast={showToast}
              />
            ) : currentView === 'project-detail' ? (
              <ProjectDetailView
                project={selectedProject || activeWorkspace}
                allProjects={allProjects}
                onBack={() => setCurrentView('workspace')}
                onOpenChat={handleOpenChat}
                onNewChatWithPrompt={handleNewChatWithPrompt}
                onUpdateProject={(updated) => {
                  setSelectedProject(updated);
                  saveWorkspaceToList(updated);
                  setAllProjects(getSavedWorkspaces());
                }}
                onMoveChat={handleMoveChat}
                onDeleteChat={handleDeleteChat}
                onStartNewProject={() => setIsCreateModalOpen(true)}
                onToast={showToast}
              />
            ) : currentView === 'git' ? (
              <GitPanel
                activeWorkspace={activeWorkspace}
                setCurrentView={setCurrentView}
                onToast={showToast}
              />
            ) : (
              <ChatArea
                currentView={currentView}
                setCurrentView={setCurrentView}
                messages={messages}
                setMessages={setMessages}
                onToast={showToast}
                activeWorkspace={activeWorkspace}
                pendingPrompt={pendingPrompt}
                onClearPendingPrompt={() => setPendingPrompt(null)}
              />
            )}
          </div>
        )}
      </ErrorBoundary>

      {/* Create Project Modal (Image 2) */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProjectFromModal}
      />

      {/* Settings / System Invariants Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={closeToast}
      />
    </div>
  );
}
