import { React, useEffect, useState } from 'react';
import './styles.css';
import logo from "../img/Vector (1).svg";
import frame48 from "./img/Frame 48.svg";
import frame49 from "./img/Frame 49.svg";
import boardImage from "./img/Board.svg";
import { Link } from "react-router-dom";

function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Set the document title
    document.title = "Prysm - Transform Fan Requests into Reality";
  }, []);

  const handleScroll = () => {
    if (window.scrollY > 0) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
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

  return (
    <>      <nav className={isScrolled ? 'scrolled' : ''}>
      <div className="logo">
        <Link to="/">
          <img src={logo} alt="Prysm Logo" className="logo" />
        </Link>
      </div>
      <div className="waitlist-btn">
        <button type="button">
          <a href="#waitlist">Get Early Access</a>
        </button>
      </div>
    </nav>

      <section className="home">
        <div className="text">
          <h1>Transform Fan<br /> Requests into Reality.</h1>
          <p>The all-in-one platform for creators to take audience requests,<br />monetize fan inputs, and deliver personalized<br />experiences at scale.</p>
          <button type="button"><a href="#waitlist">Get Early Access</a></button>
        </div>
        <div className="images">
          <div className="column left-column">
            <img src={frame48} alt="Frame 46" className="frame" />
            <img src={frame48} alt="Frame 46" className="frame" />
            <img src={frame48} alt="Frame 46" className="frame" />
            <img src={frame48} alt="Frame 46" className="frame" />
          </div>
          <div className="column right-column">
            <img src={frame49} alt="Frame 47" className="frame" />
            <img src={frame49} alt="Frame 47" className="frame" />
            <img src={frame49} alt="Frame 47" className="frame" />
            <img src={frame49} alt="Frame 47" className="frame" />
          </div>
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
              <p>Unlock new income opportunities with Atarea,<br />whether they're simple follower suggestions or<br />complex project commissions.</p>
              <p>Set your own terms, choose which requests to<br />fulfill, and start building your new income stream.</p>
              <button className="button">
                <a href="#waitlist">Get Early Access</a>
              </button>
            </div>
          </div>

          <div className="postit p2">
            <div className="content">
              <h3>Unlock Your<br />Community Data</h3>
              <p>Atarea's request congregation provide deep<br />insights into your community's preferences.</p>
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

      {/* <section id="waitlist">
        <div className="waitlist-box">
          <div className="text">
            <div className="launchlist-container">
              <div className="launchlist-widget" data-key-id="UpeyL8" data-height="180px"></div>
            </div>
          </div>
        </div>
      </section> */}
      
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
            {/* <img src="path/to/your/image.png" alt="Creator Icon" className="creator-icon" /> */}
            <h2>For all creators</h2>
            <div className="launchlist-container">
              <div className="launchlist-widget" data-key-id="UpeyL8" data-height="180px"></div>
            </div>
          </div>
        </div>  
      </section>
    </>
  );
}

export default HomePage;