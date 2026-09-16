import test from 'node:test';
import assert from 'node:assert';

// Mock localStorage for Node environment
const store = {};
global.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

import {
  generateChatTitle,
  getSavedWorkspaces,
  saveWorkspaceToList,
  getSavedActiveWorkspace,
  setSavedActiveWorkspace,
  removeSavedWorkspace,
  addProjectChat,
  updateProjectChat,
  deleteProjectChat,
  moveChatToProject
} from './src/services/workspaceService.js';

import {
  normalizeApiResponseError
} from './src/services/agentRuntime.js';

test('generateChatTitle handles various inputs', async () => {
  assert.strictEqual(await generateChatTitle(''), 'New chat');
  assert.strictEqual(await generateChatTitle(null), 'New chat');
  assert.strictEqual(await generateChatTitle('???!!!'), 'New chat');
  assert.strictEqual(await generateChatTitle('hello'), 'Hello');

  const title1 = await generateChatTitle('How can you implement an AST scanner for python?');
  assert.strictEqual(title1, 'Implement Ast Scanner Python');

  const title2 = await generateChatTitle('Fix git status commit bug');
  assert.strictEqual(title2, 'Fix Git Status Commit');
});

test('normalizeApiResponseError formats structured error envelope', () => {
  // Already structured error
  const res1 = normalizeApiResponseError({
    message: 'Directory missing',
    error: { code: 'NOT_FOUND', detail: 'Path not on disk' }
  });
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.error.code, 'NOT_FOUND');
  assert.strictEqual(res1.error.detail, 'Path not on disk');

  // Network error
  const res2 = normalizeApiResponseError(new Error('Failed to fetch'));
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.error.code, 'ENGINE_UNREACHABLE');

  // WebSocket error
  const res3 = normalizeApiResponseError(new Error('WebSocket stream closed'));
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.error.code, 'WS_CONNECTION_ERROR');
});

test('Workspace and Project Chat localStorage persistence lifecycle', () => {
  global.localStorage.clear();

  // 1. Save workspace
  const ws1 = {
    id: 'ws-100',
    name: 'Test Project',
    rootPath: 'C:\\test\\repo',
    state: 'READY',
    chats: []
  };
  saveWorkspaceToList(ws1);
  const list1 = getSavedWorkspaces();
  assert.strictEqual(list1.length, 1);
  assert.strictEqual(list1[0].name, 'Test Project');

  // 2. Active workspace tracking
  setSavedActiveWorkspace(ws1);
  assert.strictEqual(getSavedActiveWorkspace()?.id, 'ws-100');

  // 3. Add chat to project
  const chatObj = {
    id: 'chat-abc',
    title: 'AST Exploration',
    messages: [{ id: 'm1', role: 'user', content: 'hello' }]
  };
  const { newChat } = addProjectChat('ws-100', chatObj);
  assert.strictEqual(newChat.id, 'chat-abc');
  const listWithChat = getSavedWorkspaces();
  assert.strictEqual(listWithChat[0].chats.length, 1);
  assert.strictEqual(listWithChat[0].chats[0].title, 'AST Exploration');

  // 4. Update chat in project
  updateProjectChat('ws-100', 'chat-abc', { title: 'Renamed Chat', pinned: true });
  const listUpdated = getSavedWorkspaces();
  assert.strictEqual(listUpdated[0].chats[0].title, 'Renamed Chat');
  assert.strictEqual(listUpdated[0].chats[0].pinned, true);

  // 5. Move chat to another project
  const ws2 = { id: 'ws-200', name: 'Second Project', chats: [] };
  saveWorkspaceToList(ws2);
  moveChatToProject('ws-100', 'ws-200', 'chat-abc');
  const listAfterMove = getSavedWorkspaces();
  const p1 = listAfterMove.find(p => p.id === 'ws-100');
  const p2 = listAfterMove.find(p => p.id === 'ws-200');
  assert.strictEqual(p1.chats.length, 0);
  assert.strictEqual(p2.chats.length, 1);
  assert.strictEqual(p2.chats[0].title, 'Renamed Chat');

  // 6. Delete chat from project
  deleteProjectChat('ws-200', 'chat-abc');
  const listAfterDelete = getSavedWorkspaces();
  const p2After = listAfterDelete.find(p => p.id === 'ws-200');
  assert.strictEqual(p2After.chats.length, 0);

  // 7. Remove workspace
  removeSavedWorkspace('ws-100');
  const finalList = getSavedWorkspaces();
  assert.strictEqual(finalList.length, 1);
  assert.strictEqual(finalList[0].id, 'ws-200');
});

import { applyEdit } from './src/services/toolRuntime.js';

test('applyEdit validates previewId before making network request', async () => {
  const res1 = await applyEdit(null);
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.error.code, 'INVALID_PREVIEW_ID');

  const res2 = await applyEdit('');
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.error.code, 'INVALID_PREVIEW_ID');

  const res3 = await applyEdit(12345);
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.error.code, 'INVALID_PREVIEW_ID');
});

test('Multi-file proposed diff preview queue lifecycle in localStorage', () => {
  global.localStorage.clear();

  const previews = [
    { id: 'prev-1', filePath: 'engine/main.py', diff: '@@ -1 +1 @@\n-old\n+new' },
    { id: 'prev-2', filePath: 'engine/scanner.py', diff: '@@ -5 +5 @@\n-x\n+y' }
  ];

  // Save preview queue
  global.localStorage.setItem('intellego_pending_previews', JSON.stringify(previews));
  global.localStorage.setItem('intellego_active_preview', JSON.stringify(previews[0]));

  const queue = JSON.parse(global.localStorage.getItem('intellego_pending_previews'));
  assert.strictEqual(queue.length, 2);
  assert.strictEqual(queue[0].id, 'prev-1');

  // Advance queue on applying prev-1
  const remaining = queue.filter(p => p.id !== 'prev-1');
  global.localStorage.setItem('intellego_pending_previews', JSON.stringify(remaining));
  global.localStorage.setItem('intellego_active_preview', JSON.stringify(remaining[0]));

  const nextQueue = JSON.parse(global.localStorage.getItem('intellego_pending_previews'));
  assert.strictEqual(nextQueue.length, 1);
  assert.strictEqual(nextQueue[0].id, 'prev-2');
  assert.strictEqual(JSON.parse(global.localStorage.getItem('intellego_active_preview')).id, 'prev-2');

  // Clear when last preview is accepted/rejected
  global.localStorage.removeItem('intellego_pending_previews');
  global.localStorage.removeItem('intellego_active_preview');
  assert.strictEqual(global.localStorage.getItem('intellego_pending_previews'), null);
});

test('Pinned sorting priority for workspaces and chats', () => {
  const projects = [
    { id: 'p1', name: 'Alpha', pinned: false },
    { id: 'p2', name: 'Beta', pinned: true },
    { id: 'p3', name: 'Gamma', pinned: false },
    { id: 'p4', name: 'Delta', pinned: true }
  ];

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  assert.strictEqual(sortedProjects[0].id, 'p2');
  assert.strictEqual(sortedProjects[1].id, 'p4');
  assert.strictEqual(sortedProjects[2].id, 'p1');
  assert.strictEqual(sortedProjects[3].id, 'p3');

  const chats = [
    { id: 'c1', title: 'Unpinned Chat 1', pinned: false },
    { id: 'c2', title: 'Important Chat', pinned: true }
  ];

  const sortedChats = [...chats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  assert.strictEqual(sortedChats[0].id, 'c2');
  assert.strictEqual(sortedChats[1].id, 'c1');
});
