import { getAllFriends } from '@/lib/friends';
import Image from 'next/image';
import Link from 'next/link';

export default async function FriendsPage() {
  const friends = getAllFriends();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">邻居</h1>
      <p className="text-gray-600 mb-8">志同道合的朋友们</p>
      
      {friends.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无友链</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              href={friend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-4 mb-3">
                {friend.avatar ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={friend.avatar}
                      alt={friend.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 text-lg">{friend.name[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{friend.name}</h3>
                </div>
              </div>
              {friend.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{friend.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

