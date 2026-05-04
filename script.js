class MovieExplorer {
    constructor() {
        this.API_KEY = '';
        this.API_URL = 'https://api.themoviedb.org/3';
        this.IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
        this.BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';
        this.FALLBACK_IMAGE = 'https://via.placeholder.com/500x750?text=No+Poster+Available';

        this.watchlist = JSON.parse(localStorage.getItem('myMovieGridList')) || [];
        this.genres = {};
        this.currentFilter = { genre: '', year: '', sort: '' };
        this.searchTimeout = null;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadGenres();
        this.setupYearFilter();

        // Load the Big Hero Picture first
        await this.loadHeroFeature();

        await this.loadTrendingMovies();
        await this.loadRandomMovies();
        this.updateWatchlistCount();
    }

    setupEventListeners() {
        // Search Logic
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 500);
        });

        // Filters
        document.getElementById('genreFilter').addEventListener('change', () => this.handleFilterChange());
        document.getElementById('yearFilter').addEventListener('change', () => this.handleFilterChange());
        document.getElementById('sortFilter').addEventListener('change', () => this.handleFilterChange());
        document.getElementById('clearBtn').addEventListener('click', () => location.reload());

        // Navigation
        document.getElementById('watchlistBtn').addEventListener('click', () => this.showWatchlist(true));
        document.getElementById('closeWatchlist').addEventListener('click', () => this.showWatchlist(false));

        // Carousel Scroll
        document.getElementById('trendingPrev').addEventListener('click', () => this.scrollCarousel('prev'));
        document.getElementById('trendingNext').addEventListener('click', () => this.scrollCarousel('next'));
    }

    // --- HERO SECTION ---
    async loadHeroFeature() {
        try {
            const response = await fetch(`${this.API_URL}/trending/movie/day?api_key=${this.API_KEY}`);
            const data = await response.json();
            const featured = data.results[0];

            const hero = document.getElementById('heroSection');
            hero.style.backgroundImage = `url('${this.BACKDROP_BASE_URL}${featured.backdrop_path}')`;

            document.getElementById('heroTitle').textContent = featured.title;
            document.getElementById('heroRating').textContent = `★ ${featured.vote_average.toFixed(1)}`;
            document.getElementById('heroYear').textContent = featured.release_date.split('-')[0];
            document.getElementById('heroDesc').textContent = featured.overview;

            // Button actions
            document.getElementById('heroTrailerBtn').onclick = () => this.openTrailer(featured.id);
            document.getElementById('heroListBtn').onclick = (e) => this.toggleMovieInWatchlist(featured, e);
        } catch (error) {
            console.error('Hero Load Error:', error);
        }
    }

    async openTrailer(movieId) {
        try {
            const res = await fetch(`${this.API_URL}/movie/${movieId}/videos?api_key=${this.API_KEY}`);
            const data = await res.json();
            const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) {
                window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
            } else {
                alert("Trailer not found.");
            }
        } catch (e) { console.error(e); }
    }

    // --- WATCHLIST LOGIC ---
    showWatchlist(show) {
        document.getElementById('homeContent').style.display = show ? 'none' : 'block';
        document.getElementById('watchlistSection').style.display = show ? 'block' : 'none';
        if (show) this.renderWatchlist();
    }

    toggleMovieInWatchlist(movieData, event) {
        if (event) event.stopPropagation();

        const index = this.watchlist.findIndex(m => m.id === movieData.id);
        if (index === -1) {
            this.watchlist.push(movieData);
        } else {
            this.watchlist.splice(index, 1);
        }

        localStorage.setItem('myMovieGridList', JSON.stringify(this.watchlist));
        this.updateWatchlistCount();

        // Update any existing buttons for this movie on the screen
        const btns = document.querySelectorAll(`button[data-id="${movieData.id}"]`);
        btns.forEach(btn => {
            const isSaved = this.watchlist.some(m => m.id === movieData.id);
            btn.classList.toggle('active', isSaved);
            btn.innerHTML = isSaved ? '❤️ In My List' : '🤍 Add to List';
        });

        // Also update the Hero button specifically if it's the same movie
        const heroBtn = document.getElementById('heroListBtn');
        if (heroBtn && movieData.title === document.getElementById('heroTitle').textContent) {
            const isSaved = this.watchlist.some(m => m.id === movieData.id);
            heroBtn.textContent = isSaved ? '❤️ In My List' : '+ My List';
        }

        if (document.getElementById('watchlistSection').style.display === 'block') {
            this.renderWatchlist();
        }
    }

    updateWatchlistCount() {
        document.getElementById('listCount').textContent = this.watchlist.length;
    }

    renderWatchlist() {
        const grid = document.getElementById('watchlistGrid');
        grid.innerHTML = this.watchlist.length
            ? this.watchlist.map(m => this.createMovieCard(m)).join('')
            : '<p style="text-align:center; width:100%; color:#666;">Your list is empty.</p>';
    }

    // --- CORE API DATA ---
    async loadGenres() {
        const res = await fetch(`${this.API_URL}/genre/movie/list?api_key=${this.API_KEY}`);
        const data = await res.json();
        const select = document.getElementById('genreFilter');
        data.genres.forEach(g => {
            this.genres[g.id] = g.name;
            const opt = document.createElement('option');
            opt.value = g.id; opt.textContent = g.name;
            select.appendChild(opt);
        });
    }

    setupYearFilter() {
        const select = document.getElementById('yearFilter');
        for (let y = new Date().getFullYear(); y >= 1900; y--) {
            const opt = document.createElement('option');
            opt.value = y; opt.textContent = y;
            select.appendChild(opt);
        }
    }

    async loadTrendingMovies() {
        const res = await fetch(`${this.API_URL}/trending/movie/week?api_key=${this.API_KEY}`);
        const data = await res.json();
        document.getElementById('trendingCarousel').innerHTML = data.results.slice(0, 10).map((m, i) => `
            <div class="trending-card">
                <img src="${this.IMAGE_BASE_URL}${m.poster_path}" alt="${m.title}">
                <div class="trending-rank">${i + 1}</div>
                <div class="trending-overlay">
                    <div class="movie-title">${m.title}</div>
                    <div class="movie-rating">★ ${m.vote_average.toFixed(1)}</div>
                </div>
            </div>
        `).join('');
    }

    async handleSearch(query) {
        if (!query.trim()) return;
        document.getElementById('clearBtn').classList.add('show');
        document.getElementById('trendingSection').style.display = 'none';
        document.getElementById('heroSection').style.display = 'none';
        document.getElementById('randomSectionTitle').textContent = `🔍 Search: ${query}`;
        this.fetchAndDisplay(`${this.API_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}`, true);
    }

    async handleFilterChange() {
        this.currentFilter.genre = document.getElementById('genreFilter').value;
        this.currentFilter.year = document.getElementById('yearFilter').value;
        this.currentFilter.sort = document.getElementById('sortFilter').value;

        document.getElementById('heroSection').style.display = 'none';
        document.getElementById('trendingSection').style.display = 'none';
        document.getElementById('clearBtn').classList.add('show');

        let url = `${this.API_URL}/discover/movie?api_key=${this.API_KEY}`;
        if (this.currentFilter.genre) url += `&with_genres=${this.currentFilter.genre}`;
        if (this.currentFilter.year) url += `&primary_release_year=${this.currentFilter.year}`;
        if (this.currentFilter.sort) url += `&sort_by=${this.currentFilter.sort}`;

        this.fetchAndDisplay(url);
    }

    async fetchAndDisplay(url, isSearch = false) {
        const res = await fetch(url);
        const data = await res.json();
        let results = data.results;
        if (isSearch && this.currentFilter.genre) {
            results = results.filter(m => m.genre_ids.includes(parseInt(this.currentFilter.genre)));
        }
        document.getElementById('moviesGrid').innerHTML = results.map(m => this.createMovieCard(m)).join('');
    }

    createMovieCard(movie) {
        const isSaved = this.watchlist.some(m => m.id === movie.id);
        const poster = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        const movieJson = JSON.stringify({
            id: movie.id,
            title: movie.title.replace(/'/g, "&apos;"),
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average
        }).replace(/"/g, '&quot;');

        return `
            <div class="movie-card">
                <img src="${poster}" class="movie-poster" alt="${movie.title}">
                <div class="movie-info">
                    <div class="movie-title">${movie.title}</div>
                    <div class="movie-details">
                        <span>${movie.release_date ? movie.release_date.split('-')[0] : 'TBA'}</span>
                        <span class="movie-rating">★ ${movie.vote_average.toFixed(1)}</span>
                    </div>
                    <button class="add-to-list-btn ${isSaved ? 'active' : ''}" 
                            data-id="${movie.id}"
                            onclick="movieExplorer.toggleMovieInWatchlist(${movieJson}, event)">
                        ${isSaved ? '❤️ In My List' : '🤍 Add to List'}
                    </button>
                    <div class="movie-description">${movie.overview || 'No description available.'}</div>
                </div>
            </div>`;
    }

    async loadRandomMovies() {
        const url = `${this.API_URL}/discover/movie?api_key=${this.API_KEY}&page=${Math.floor(Math.random() * 5) + 1}`;
        this.fetchAndDisplay(url);
    }

    scrollCarousel(dir) {
        const c = document.getElementById('trendingCarousel');
        c.scrollBy({ left: dir === 'next' ? 300 : -300, behavior: 'smooth' });
    }
}

// Global instance
window.movieExplorer = new MovieExplorer();