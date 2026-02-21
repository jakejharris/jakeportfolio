'use client';

import { useState, useEffect } from 'react';

interface Post {
  _id: string;
  title: string;
  viewCount: number | null;
}

export default function ViewAdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [updateAmounts, setUpdateAmounts] = useState<Record<string, string>>({});
  const [updateError, setUpdateError] = useState<Record<string, string>>({});
  const [updateLoading, setUpdateLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (password === 'password') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password');
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setUpdateError({});
    try {
      const response = await fetch('/api/viewadmin');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data: Post[] = await response.json();
      // Initialize viewCount to 0 if null/undefined
      const postsWithViews = data.map(post => ({ ...post, viewCount: post.viewCount ?? 0 }));
      setPosts(postsWithViews);
      // Initialize update amounts
      const initialAmounts: Record<string, string> = {};
      postsWithViews.forEach(post => {
        initialAmounts[post._id] = '0';
      });
      setUpdateAmounts(initialAmounts);
    } catch (error: any) {
      setAuthError(error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (postId: string, value: string) => {
    // Allow only numbers (including negative sign)
    if (/^-?\d*$/.test(value)) {
        setUpdateAmounts(prev => ({ ...prev, [postId]: value }));
        setUpdateError(prev => ({ ...prev, [postId]: '' })); // Clear error on change
    }
  };

  const handleUpdateViews = async (postId: string) => {
    const amountStr = updateAmounts[postId] || '0';
    const changeAmount = parseInt(amountStr, 10);

    if (isNaN(changeAmount) || changeAmount === 0) {
        setUpdateError(prev => ({ ...prev, [postId]: 'Enter a non-zero number' }));
      return; // No change needed or invalid input
    }

    const post = posts.find(p => p._id === postId);
    if (!post) return;

    const currentViews = post.viewCount ?? 0;
    const newViewCount = currentViews + changeAmount;

    if (newViewCount < 0) {
        setUpdateError(prev => ({ ...prev, [postId]: 'Resulting views cannot be negative' }));
      return;
    }

    const confirmationMessage = 
      `This will change the view count for \"${post.title}\" ` +
      `from ${currentViews} to ${newViewCount} (change: ${changeAmount > 0 ? '+' : ''}${changeAmount}). ` +
      `Are you sure?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setUpdateLoading(prev => ({ ...prev, [postId]: true }));
    setUpdateError(prev => ({ ...prev, [postId]: '' }));

    try {
      const response = await fetch('/api/viewadmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId, changeAmount }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update view count');
      }

      // Update local state on success
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === postId ? { ...p, viewCount: result.viewCount } : p
        )
      );
      setUpdateAmounts(prev => ({ ...prev, [postId]: '0' })); // Reset input

    } catch (error: any) {
      console.error('Update error:', error);
      setUpdateError(prev => ({ ...prev, [postId]: error.message || 'Update failed' }));
    } finally {
      setUpdateLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
        <div className="flex space-x-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} // Allow Enter key to login
            placeholder="Enter password"
            className="border p-2 rounded text-black"
          />
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </div>
        {authError && <p className="text-red-500 mt-2">{authError}</p>}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">View Count Admin</h1>
      {loading && <p>Loading posts...</p>}
      {!loading && authError && <p className="text-red-500">Error loading posts: {authError}</p>}
      {!loading && !authError && (
        <ul className="space-y-4">
          {posts.map(post => (
            <li key={post._id} className="border p-4 rounded shadow">
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="mb-2">Current Views: {post.viewCount ?? 'N/A'}</p>
              <div className="flex items-center space-x-2">
                <label htmlFor={`amount-${post._id}`} className="sr-only">Amount to change</label>
                <input
                  type="text" // Use text to allow negative sign easily
                  id={`amount-${post._id}`}
                  value={updateAmounts[post._id] || '0'}
                  onChange={(e) => handleAmountChange(post._id, e.target.value)}
                  className="border p-1 rounded w-20 text-black"
                  placeholder="+/- amount"
                />
                <button
                  onClick={() => handleUpdateViews(post._id)}
                  disabled={updateLoading[post._id]}
                  className={`bg-green-500 text-white p-1 px-3 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${updateLoading[post._id] ? 'animate-pulse' : ''}`}
                >
                  {updateLoading[post._id] ? 'Updating...' : 'Apply Change'}
                </button>
              </div>
              {updateError[post._id] && <p className="text-red-500 text-sm mt-1">{updateError[post._id]}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 