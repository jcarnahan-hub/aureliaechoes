// ── AURELIA ECHOES: Google Books API Integration ──

const GOOGLE_BOOKS_API_KEY = 'AIzaSyACDkAs-5myPgb4Emn6YLqc_MAnOSzqynk';
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

// Search for books by series or author name
async function searchGoogleBooks(query) {
  try {
    const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=40&key=${GOOGLE_BOOKS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items) return [];
    return data.items.map(item => parseGoogleBook(item));
  } catch (err) {
    console.error('Google Books search error:', err);
    return [];
  }
}

// Search specifically for a series
async function searchSeries(seriesName) {
  const results = await searchGoogleBooks(`intitle:"${seriesName}"`);
  return results.filter(book =>
    book.title.toLowerCase().includes(seriesName.toLowerCase()) ||
    (book.series && book.series.toLowerCase().includes(seriesName.toLowerCase()))
  );
}

// Search by author
async function searchByAuthor(authorName) {
  return await searchGoogleBooks(`inauthor:"${authorName}"`);
}

// Get a single book by its Google Books ID
async function getBookById(googleId) {
  try {
    const url = `${GOOGLE_BOOKS_BASE}/volumes/${googleId}?key=${GOOGLE_BOOKS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return parseGoogleBook(data);
  } catch (err) {
    console.error('Google Books fetch error:', err);
    return null;
  }
}

// Parse a Google Books API response into our app's format
function parseGoogleBook(item) {
  const info = item.volumeInfo || {};
  const cover = info.imageLinks
    ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '')
    : '';

  // Make cover URL use HTTPS (Google sometimes returns HTTP)
  const secureCover = cover.replace('http://', 'https://');

  return {
    googleId: item.id || '',
    title: info.title || 'Unknown Title',
    author: (info.authors || ['Unknown Author']).join(', '),
    series: extractSeries(info.title, info.description),
    seriesNumber: extractSeriesNumber(info.title),
    coverUrl: secureCover,
    publishedDate: info.publishedDate || '',
    description: info.description || '',
    pageCount: info.pageCount || 0,
    categories: (info.categories || []).join(', '),
    status: 'owned'
  };
}

// Try to extract series name from title (e.g. "The Name of the Wind (Kingkiller Chronicle, #1)")
function extractSeries(title, description) {
  if (!title) return '';
  const match = title.match(/\(([^,#)]+)[,#]/);
  return match ? match[1].trim() : '';
}

// Try to extract series number from title (e.g. "#1" or "Book 3")
function extractSeriesNumber(title) {
  if (!title) return '';
  const match = title.match(/#(\d+\.?\d*)/);
  if (match) return match[1];
  const bookMatch = title.match(/Book\s+(\d+)/i);
  return bookMatch ? bookMatch[1] : '';
}

// Fetch a cover image URL for a book by title + author
async function fetchCoverUrl(title, author) {
  try {
    const query = `intitle:"${title}" inauthor:"${author}"`;
    const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=1&key=${GOOGLE_BOOKS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items || !data.items[0]) return '';
    const info = data.items[0].volumeInfo || {};
    const cover = info.imageLinks
      ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '')
      : '';
    return cover.replace('http://', 'https://');
  } catch (err) {
    return '';
  }
}
