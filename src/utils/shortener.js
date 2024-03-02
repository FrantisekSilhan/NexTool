function isValidUrl(str) {
  const pattern = /^(http|https):\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/;
  return pattern.test(str) && !str.includes(config.siteUrl);
}

function isValidShortCode(str) {
  const pattern = /^[a-zA-Z0-9_-]{4,16}$/;
  return pattern.test(str);
}