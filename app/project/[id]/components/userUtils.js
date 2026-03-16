// Function to get initials from username
export const getInitials = (username) => {
  if (!username) return "??";
  const words = username.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
};

// Function to get a color based on user ID
export const getUserColor = (userId) => {
  if (!userId) return "bg-gray-500";
  
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  // Use user ID to consistently select a color
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
};
