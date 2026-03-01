import fs from 'fs';
import path from 'path';

const friendsFilePath = path.join(process.cwd(), 'content/friends.json');

export interface Friend {
  id: string;
  name: string;
  url: string;
  description?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
}

// 确保文件存在
function ensureFileExists() {
  const dir = path.dirname(friendsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(friendsFilePath)) {
    fs.writeFileSync(friendsFilePath, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllFriends(): Friend[] {
  ensureFileExists();
  
  if (!fs.existsSync(friendsFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(friendsFilePath, 'utf8');
    const friends = JSON.parse(fileContents) as Friend[];
    // 按创建时间倒序排列
    return friends.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error reading friends file:', error);
    return [];
  }
}

export function getFriendById(id: string): Friend | null {
  const friends = getAllFriends();
  return friends.find(f => f.id === id) || null;
}

export function createFriend(friend: Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>): string {
  ensureFileExists();
  
  const friends = getAllFriends();
  const id = Date.now().toString();
  const newFriend: Friend = {
    id,
    ...friend,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  friends.push(newFriend);
  fs.writeFileSync(friendsFilePath, JSON.stringify(friends, null, 2), 'utf8');

  return id;
}

export function updateFriend(id: string, friend: Partial<Omit<Friend, 'id' | 'createdAt'>>): boolean {
  ensureFileExists();
  
  const friends = getAllFriends();
  const index = friends.findIndex(f => f.id === id);
  
  if (index === -1) {
    return false;
  }

  friends[index] = {
    ...friends[index],
    ...friend,
    updatedAt: Date.now(),
  };

  fs.writeFileSync(friendsFilePath, JSON.stringify(friends, null, 2), 'utf8');
  return true;
}

export function deleteFriend(id: string): boolean {
  ensureFileExists();
  
  const friends = getAllFriends();
  const filteredFriends = friends.filter(f => f.id !== id);
  
  if (filteredFriends.length === friends.length) {
    return false; // 没有找到要删除的友链
  }

  fs.writeFileSync(friendsFilePath, JSON.stringify(filteredFriends, null, 2), 'utf8');
  return true;
}

