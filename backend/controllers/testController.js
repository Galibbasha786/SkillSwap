exports.testMeetLinks = async (req, res) => {
  const links = [];
  for (let i = 0; i < 5; i++) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const getRandomChars = (length) => {
      let result = '';
      for (let j = 0; j < length; j++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    };
    
    links.push({
      formatted: `https://meet.google.com/${getRandomChars(3)}-${getRandomChars(4)}-${getRandomChars(3)}`,
      simple: `https://meet.google.com/${getRandomChars(12)}`
    });
  }
  res.json({ success: true, links });
};