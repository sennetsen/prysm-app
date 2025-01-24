const createBoard = async (boardName, ownerEmail) => {
  const urlPath = generateUrlPath(boardName);

  const { data, error } = await supabase
    .from('boards')
    .insert([
      {
        name: boardName,
        owner_email: ownerEmail,
        url_path: urlPath,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating board:', error);
    return null;
  }

  return data;
}; 