(() => {
  // src/app.js
  console.log("Telier app starting...");
  if (typeof window !== "undefined") {
    window.appReady = true;
  }
})();
