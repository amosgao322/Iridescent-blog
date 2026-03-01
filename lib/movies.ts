import fs from 'fs';
import path from 'path';

const moviesFilePath = path.join(process.cwd(), 'content/movies.json');

export type MovieStatus = '已看完' | '已二刷' | '待二刷' | '进行中' | '待观看';

export interface Movie {
  id: string;
  name: string;
  score: number; // 0-100
  status: MovieStatus;
  review: string;
  tag?: string; // 标签
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
}

// 确保文件存在
function ensureFileExists() {
  const dir = path.dirname(moviesFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(moviesFilePath)) {
    fs.writeFileSync(moviesFilePath, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllMovies(): Movie[] {
  ensureFileExists();
  
  if (!fs.existsSync(moviesFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(moviesFilePath, 'utf8');
    const movies = JSON.parse(fileContents) as Movie[];
    // 按创建时间倒序排列
    return movies.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error reading movies file:', error);
    return [];
  }
}

export function getMovieById(id: string): Movie | null {
  const movies = getAllMovies();
  return movies.find(m => m.id === id) || null;
}

export function createMovie(movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>): string {
  ensureFileExists();
  
  const movies = getAllMovies();
  const id = Date.now().toString();
  const newMovie: Movie = {
    id,
    ...movie,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  movies.push(newMovie);
  fs.writeFileSync(moviesFilePath, JSON.stringify(movies, null, 2), 'utf8');

  return id;
}

export function updateMovie(id: string, movie: Partial<Omit<Movie, 'id' | 'createdAt'>>): boolean {
  ensureFileExists();
  
  const movies = getAllMovies();
  const index = movies.findIndex(m => m.id === id);
  
  if (index === -1) {
    return false;
  }

  movies[index] = {
    ...movies[index],
    ...movie,
    updatedAt: Date.now(),
  };

  fs.writeFileSync(moviesFilePath, JSON.stringify(movies, null, 2), 'utf8');
  return true;
}

export function deleteMovie(id: string): boolean {
  ensureFileExists();
  
  const movies = getAllMovies();
  const filteredMovies = movies.filter(m => m.id !== id);
  
  if (filteredMovies.length === movies.length) {
    return false; // 没有找到要删除的电影
  }

  fs.writeFileSync(moviesFilePath, JSON.stringify(filteredMovies, null, 2), 'utf8');
  return true;
}

// 筛选和排序辅助函数
export function filterMoviesByStatus(movies: Movie[], status: MovieStatus | '全部'): Movie[] {
  if (status === '全部') {
    return movies;
  }
  return movies.filter(m => m.status === status);
}

export function sortMoviesByScore(movies: Movie[], order: 'asc' | 'desc' = 'desc'): Movie[] {
  return [...movies].sort((a, b) => {
    if (order === 'desc') {
      return b.score - a.score;
    } else {
      return a.score - b.score;
    }
  });
}

export function searchMoviesByName(movies: Movie[], search: string): Movie[] {
  if (!search || search.trim() === '') {
    return movies;
  }
  const searchLower = search.toLowerCase();
  return movies.filter(m => m.name.toLowerCase().includes(searchLower));
}

