function generateInviteCode(userId) {
  function generateRandomString(length, uppercase = false) {
    const characters = uppercase ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  const firstPart = generateRandomString(11);
  const secondPart = generateRandomString(5) + "-" + generateRandomString(5, true);
  const formattedUserId = String(userId).padStart(8, "0");

  const inviteCode = `${firstPart}-${secondPart}--${formattedUserId}`;

  return inviteCode;
}

module.exports = {
  generateInviteCode
};