function ShareButton({ boardPath }) {
  const handleShare = () => {
    const boardUrl = `${window.location.origin}/${boardPath}`;
    navigator.clipboard.writeText(boardUrl);
    // Add some UI feedback that the URL was copied
  };

  return (
    <button className="share-button" onClick={handleShare}>
      Share
    </button>
  );
} 