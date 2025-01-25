const createBoard = async (boardName, ownerEmail) => {
  const urlPath = `${generateUrlPath(boardName)}-${ownerEmail.split('@')[0]}`;

  const { data: existing } = await supabase
    .from('boards')
    .select('url_path')
    .eq('url_path', urlPath);

  if (existing.length > 0) {
    throw new Error('Board URL already exists');
  }

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