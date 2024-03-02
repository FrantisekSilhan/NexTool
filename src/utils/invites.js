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
  const secondPart = generateRandomString(5) + generateRandomString(5, true);
  const formattedUserId = userId.toString(36).padStart(8, "0");

  const inviteCode = `${firstPart}-${secondPart}--${formattedUserId}`;

  return inviteCode;
}

function getUserId(inviteCode) {
  const parts = inviteCode.split("--");

  if (parts.length !== 2) {
    return null;
  }

  const userId = parseInt(parts[1], 36);

  return userId;
}

module.exports = {
	generateInviteCode,
	getUserId
};