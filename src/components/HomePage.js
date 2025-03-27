import React, { useEffect, useRef, useState } from 'react';
import './HomePage.css';
import undertaleImg from '../images/Undertale.jpg';
import { FaSearch, FaPlay, FaSyncAlt, FaShareAlt } from 'react-icons/fa';

const defaultPlaylist = [
  { title: 'Megalovania', duration: '2:36', file: 'Megalovania.mp3' },
  { title: 'Dummy!', duration: '2:25', file: 'Dummy!.mp3' },
  { title: 'Spear of Justice', duration: '1:55', file: 'Spear of Justice.mp3' },
  { title: 'Metal Crusher', duration: '1:03', file: 'Metal Crusher.mp3' },
  { title: 'Hopes and Dreams', duration: '3:01', file: 'Hopes and Dreams.mp3' },
  { title: 'Bonetrousle', duration: '0:57', file: 'Bontrousle.mp3' },
  { title: 'Waterfall', duration: '2:06', file: 'Waterfall.mp3' }
];

const HomePage = () => {
  const audioRef = useRef(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('playlist');
    if (stored) {
      try {
        setPlaylist(JSON.parse(stored));
      } catch (e) {
        console.error('Invalid session playlist data. Resetting to default.');
        sessionStorage.setItem('playlist', JSON.stringify(defaultPlaylist));
        setPlaylist(defaultPlaylist);
      }
    } else {
      sessionStorage.setItem('playlist', JSON.stringify(defaultPlaylist));
      setPlaylist(defaultPlaylist);
    }
  }, []);

  useEffect(() => {
    fetch('https://solitary-king-f40e.j-murawski1515.workers.dev/')
      .then(res => res.json())
      .then(data => {
        if (data?.info) {
          localStorage.setItem('Info', data.info);
        }
      })
      .catch(err => console.error('Info API error:', err));
  }, []);
  

  const handleSearch = async () => {
    try {
      const response = await fetch('https://divine-violet-1ac0.j-murawski1515.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: searchInput,
          playlist
        })
      });
  
      const data = await response.json();
      console.log(data)
      if (data.success && Array.isArray(data.playlist)) {
        sessionStorage.setItem('playlist', JSON.stringify(data.playlist));
        setPlaylist(data.playlist);
        alert(data.message || 'Song added to playlist!');
      } else {
        alert(data.message || 'Nothing happened.');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Nah.');
    }
  };
  

  const handleRefresh = () => {
    const updated = sessionStorage.getItem('playlist');
    if (updated) {
      try {
        setPlaylist(JSON.parse(updated));
        alert('Playlist reloaded!');
      } catch {
        alert('Failed to parse playlist data.');
      }
    }
  };

  const handleShare = async () => {
    try {
      const response = await fetch('https://damp-hill-8f6d.j-murawski1515.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist })
      });
  
      const data = await response.json();
      alert(data.message || 'Something weird happened...');
    } catch (err) {
      console.error('Share error:', err);
      alert('Could not share your playlist.');
    }
  };
  

  const playSong = (file) => {
    if (currentlyPlaying === file) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setCurrentlyPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/songs/${file}`);

    audio
      .play()
      .then(() => {
        audioRef.current = audio;
        setCurrentlyPlaying(file);
      })
      .catch((err) => {
        alert(`FUCK. Why couldn't I play the song...`);
        console.error(`Audio error:`, err);
        audioRef.current = null;
        setCurrentlyPlaying(null);
      });
  };

  return (
    <div className="homepage">
      <div className="header-bar">
        <div className="header-left">
          <h1>UNDERTALE Playlist</h1>
        </div>

        <div className="header-center">
          <div className="search-bar">
            <input type="text" placeholder="Add song to Playlist" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}/>
            <button onClick={handleSearch}>
              <FaSearch />
            </button>
          </div>
        </div>

        <div className="header-right">
          <button onClick={handleRefresh} title="Refresh Playlist">
            <FaSyncAlt />
          </button>
          <button onClick={handleShare} title="Share Playlist">
            <FaShareAlt />
          </button>
        </div>
      </div>
      <div className="song-list">
        {playlist.map((song, index) => (
          <div key={index} className="song-card">
            <img src={undertaleImg} alt="Album Art" />
            <div className="song-info">
              <h2>{song.title}</h2>
              <p>{song.duration}</p>
            </div>
            <div className="button-group">
              <button
                className="play-button"
                onClick={() => playSong(song.file)}
                title={currentlyPlaying === song.file ? 'Stop' : 'Play'}
              >
                <FaPlay />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
