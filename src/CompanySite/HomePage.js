import { React, useEffect, useState } from 'react';
import './styles.css';
import logo from "../img/Vector (1).svg";
import frame48 from "./img/Frame 48.svg";
import frame49 from "./img/Frame 49.svg";
import boardImage from "./img/Board.svg";
import { GoogleSignInButton } from '../supabaseClient';
import joinmascot from '../img/join-mascot.jpg';
import frame1 from "./img/Frame 1 (1).svg";
import frame2 from "./img/Frame 2.svg";
import { supabase } from '../supabaseClient';
import { handleSignOut } from '../components/UserProfile';

function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const handleLinkClick = () => {
    window.location.href = '/';
  };
  const [isSignInPopupOpen, setIsSignInPopupOpen] = useState(false);
  const [isCreatorAccount, setIsCreatorAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [boardData, setBoardData] = useState(null);

  useEffect(() => {
    // Set the document title
    document.title = "Prysm - Transform Fan Requests into Reality";
  }, []);

  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    setIsScrolled(scrollPosition > 0);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    // Check if the widget script is already loaded
    if (!document.querySelector('script[src="https://getlaunchlist.com/js/widget.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://getlaunchlist.com/js/widget.js';
      script.defer = true;
      script.onload = () => {
        if (window.Launchlist) {
          window.Launchlist.init();
        }
      };
      document.body.appendChild(script);
    } else if (window.Launchlist) {
      // If the script is already loaded, initialize immediately
      window.Launchlist.init();
    }
  }, []);

  useEffect(() => {
    const postits = document.querySelectorAll('.postit');
    const featuresSection = document.getElementById('features');

    const handleScroll = () => {
      const scrollTop = window.scrollY - featuresSection.offsetTop;
      const sectionHeight = featuresSection.offsetHeight;
      const scrollProgress = scrollTop / sectionHeight;

      postits.forEach((postit, index) => {
        // Each postit gets its own scroll segment (0-0.33, 0.33-0.66, 0.66-1)
        const segmentStart = index * 0.33;
        const segmentEnd = (index + 1) * 0.33;

        if (scrollProgress >= segmentStart) {
          const progressInSegment = (scrollProgress - segmentStart) / 0.33;
          const yOffset = 100 - (progressInSegment * 100);
          postit.style.transform = `translateY(${Math.min(yOffset, 0)}vh)`;
        } else {
          postit.style.transform = 'translateY(100vh)';
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignInClick = () => {
    setIsSignInPopupOpen(true);
  };

  const handleCloseSignInPopup = () => {
    const signInPopup = document.querySelector('.join-popup-content');
    const overlay = document.querySelector('.modal-overlay');

    signInPopup.classList.add('fade-out');
    overlay.classList.add('fade-out');

    setTimeout(() => {
      setIsSignInPopupOpen(false);
      signInPopup.classList.remove('fade-out');
      overlay.classList.remove('fade-out');
    }, 200);
  };

  const handleGoogleSignInSuccess = async (response) => {
    if (!response || !response.user) {
      console.error('No user found in response');
      return;
    }

    const user = response.user;

    try {
      const { data: boardData, error } = await supabase
        .from('boards')
        .select('url_path')
        .eq('email', user.email)
        .single();

      if (error || !boardData) {
        console.log('No board found for user:', user.email);
        setIsCreatorAccount(false);
        return;
      }

      // Creator found - store board data and redirect
      console.log('Board found:', boardData.url_path);
      setBoardData(boardData);
      setIsCreatorAccount(true);
      handleCloseSignInPopup();
      window.location.href = `/${boardData.url_path}`;
    } catch (error) {
      console.error('Error checking creator status:', error);
      setIsCreatorAccount(false);
    }
  };

  const checkCreatorStatus = async (userEmail) => {
    try {
      const { data: boardData, error } = await supabase
        .from('boards')
        .select('url_path')
        .eq('email', userEmail)
        .single();

      if (error || !boardData) {
        setIsCreatorAccount(false);
        return;
      }

      setBoardData(boardData);
      setIsCreatorAccount(true);
    } catch (error) {
      console.error('Error checking creator status:', error);
      setIsCreatorAccount(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user?.email) {
        checkCreatorStatus(session.user.email);
      }
    });

    // Check creator status on mount if user exists
    const checkInitialStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        checkCreatorStatus(session.user.email);
      }
    };

    checkInitialStatus();
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="logo">
          <a href="/" onClick={handleLinkClick}>
            <img src={logo} alt="Prysm Logo" className="logo" />
          </a>
        </div>
        <div className="navbar-icons">
          <button className="sign-in-button" onClick={handleSignInClick}>Creator Sign In</button>
          <div className="waitlist-btn">
            <button type="button" className="get-early-access-button">
              <a href="#waitlist">Get Early Access</a>
            </button>
          </div>
        </div>
      </nav>

      <section className="home">
        <div className="text">
          <h1>Transform Fan<br /> Requests into Reality.</h1>
          <p>The all-in-one platform for creators to take audience requests, monetize fan inputs, and deliver personalized experiences at scale.</p>
          {/* <button type="button"><a href="#waitlist">Get Early Access</a></button> */}
          <div class="launchlist-widget" data-key-id="UpeyL8" data-height="180px"></div>
        </div>
        <div className="images">
          {window.innerWidth > 768 ? (
            <>
              <div className="column left-column">
                <img src={frame48} alt="Desktop Frame 1" className="frame" />
                <img src={frame48} alt="Desktop Frame 2" className="frame" />
              </div>
              <div className="column right-column">
                <img src={frame49} alt="Desktop Frame 3" className="frame" />
                <img src={frame49} alt="Desktop Frame 4" className="frame" />
              </div>
            </>
          ) : (
            <>
              <div className="column left-column">
                <img src={frame1} alt="Mobile Frame 1" className="frame" />
                <img src={frame2} alt="Mobile Frame 2" className="frame" />
                <img src={frame1} alt="Mobile Frame 1" className="frame" />
                <img src={frame2} alt="Mobile Frame 2" className="frame" />
              </div>
              <div className="column right-column">
                {/* <img src={frame2} alt="Mobile Frame 3" className="frame" /> */}
                {/* <img src={frame2} alt="Mobile Frame 4" className="frame" /> */}
              </div>
            </>
          )}
        </div>
      </section>

      <section id="demo">
        <img src={boardImage} alt="" className="dm" />
      </section>

      <section id="features">
        <div className="postit-deck">
          <div className="postit p1">
            <div className="content">
              <h3>Take (& Monetize)<br />Any Request</h3>
              <p>Unlock new income opportunities with Prysm,<br />whether they're simple follower suggestions or<br />complex project commissions.</p>
              <p>Set your own terms, choose which requests to<br />fulfill, and start building your new income stream.</p>
              <button className="button">
                <a href="#waitlist">Get Early Access</a>
              </button>
            </div>
          </div>

          <div className="postit p2">
            <div className="content">
              <h3>Unlock Your<br />Community Data</h3>
              <p>Prysm's request congregation provide deep<br />insights into your community's preferences.</p>
              <p>Use real-time data to understand trends,<br />optimize your offerings, and create content<br />that ensures every project hits the mark.</p>
              <button className="button">
                <a href="#waitlist">Get Early Access</a>
              </button>
            </div>
          </div>

          <div className="postit p3">
            <div className="content">
              <h3>Easily Scale<br />Personalization</h3>
              <p>Respond to countless requests with advanced<br />filtering and simultaneous fulfillment</p>
              <p>From initial inquiry to final delivery, ensure every<br />request is managed with the same level of<br />quality and attention.</p>
              <button className="button">
                <a href="#waitlist">Get Early Access</a>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials">
        <div className="testimonial-container">
          <h2>For all creators</h2>
          <div className="testimonial-row">
            <p>Cosplayers <span className="highlight"> Artists</span> Crafters Designers Photographers</p>
          </div>
          <div className="testimonial-row">
            <p>Shows <span className="highlight"> Influencers</span> YouTubers TikTokers Podcasters</p>
          </div>
          <div className="testimonial-row">
            <p>Authors <span className="highlight"> Musicians</span> Bloggers Developers Singers</p>
          </div>
          <div className="testimonial-row">
            <p>Speakers <span className="highlight"> Business</span> Entrepreneurs Coaches Marketers</p>
          </div>
          <div className="testimonial-row">
            <p>Educators <span className="highlight"> Lifestyle</span> Fashion Food Beauty Advice</p>
          </div>
          <div className="testimonial-row">
            <p>Relationships <span className="highlight"> Fitness</span> Self-Help Travel Sports Finance</p>
          </div>
          <div className="testimonial-row">
            <p>Reviewers <span className="highlight"> Gamers</span> Streamers Communities Hosts</p>
          </div>
        </div>
      </section>

      <section id="waitlist">
        <div className="waitlist-box">
          <div className="waitlist-content">
            <h2>For all creators</h2>
            <div className="launchlist-container">
              <div className="launchlist-widget" data-key-id="UpeyL8" data-height="180px"></div>
            </div>
          </div>
        </div>
      </section>


      {isSignInPopupOpen && (
        <div className="modal-overlay">
          <div className="join-popup-content">
            <button className="join-popup-close" onClick={handleCloseSignInPopup}>
              &times;
            </button>
            {!user ? (
              <>
                <h2>Welcome!</h2>
                <p>If you're a creator with a</p>
                <p>Prysm account ready to go,</p>
                <p>sign in to access your board.</p>
              </>
            ) : isCreatorAccount === true ? (
              <>
                <h2 style={{ fontSize: '32px' }}>You're signed in!</h2>
                <p>Visit your board or log out</p>
                <p>to switch accounts.</p>
                <div className="creator-buttons">
                  <button
                    className="visit-board-button"
                    onClick={() => {
                      window.location.href = `/${boardData?.url_path}`;
                    }}
                  >
                    Visit Board
                  </button>
                  <button
                    className="logout-button"
                    onClick={async () => {
                      await handleSignOut(() => {
                        window.location.reload();
                        handleCloseSignInPopup();
                      }, user);
                    }}
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Oops!</h2>
                <p>Sorry, this account is not an </p>
                <p>existing creator account on Prysm.</p>
                <p style={{ marginBottom: '20px' }}>Get early access by joining our waitlist!</p>
                <button
                  className="logout-button"
                  onClick={async () => {
                    await handleSignOut(() => {
                      window.location.reload();
                      handleCloseSignInPopup();
                    }, user);
                  }}
                >
                  Log Out
                </button>
              </>
            )}
            <div className="google-signin-container">
              <GoogleSignInButton onSuccess={(response) => {
                handleGoogleSignInSuccess(response);
              }} />
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <p>Contact: <a href="mailto:getprysm@gmail.com"
            style={{ color: 'white', textDecoration: 'underline' }}>getprysm@gmail.com</a></p>
          {/* <p>© 2024 Prysm. All rights reserved.</p> */}
          <p>Follow us: @getprysm</p>
        </div>
      </footer>
    </>
  );
}

export default HomePage;