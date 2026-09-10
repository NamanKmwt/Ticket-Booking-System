// client/src/App.tsx
import { useState, useEffect } from 'react';
import './App.css';

interface Venue {
  _id: string;
  name: string;
  city: string;
  capacity: number;
}

interface EventItem {
  _id: string;
  name: string;
  date: string;
  venueId: Venue;
}

interface CachedSeat {
  id: string;
  row: string;
  number: number;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
}

export default function App() {
  const [view, setView] = useState<'HOME' | 'SEAT_SELECTION'>('HOME');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  const [seats, setSeats] = useState<CachedSeat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState('engineer@example.com');
  const [message, setMessage] = useState('');

  // 1. Fetch all events on load via Vite proxy (/api)
  useEffect(() => {
    fetch('/api/v1/events')
      .then(res => res.json())
      .then((data: { success: boolean; events: EventItem[] }) => {
        if (data.success) setEvents(data.events);
      })
      .catch(err => console.error('Failed to fetch events:', err));
  }, []);

  // 2. Fetch seat grid when an event is selected
  const fetchSeats = async (eventId: string) => {
    try {
      const response = await fetch(`/api/v1/checkout/seats/${eventId}`);
      const data = await response.json() as { success: boolean; seats: CachedSeat[] };
      if (data.success) {
        setSeats(data.seats);
      }
    } catch (error) {
      console.error('Failed to fetch seats:', error);
      setMessage('Failed to load seats from server.');
    }
  };

  useEffect(() => {
    if (view === 'SEAT_SELECTION' && selectedEvent) {
      fetchSeats(selectedEvent._id);
      const interval = setInterval(() => fetchSeats(selectedEvent._id), 3000);
      return () => clearInterval(interval);
    }
  }, [view, selectedEvent]);

  const handleSelectEvent = (event: EventItem) => {
    setSelectedEvent(event);
    setSelectedSeatIds([]);
    setMessage('');
    setView('SEAT_SELECTION');
  };

  const toggleSeatSelection = (seat: CachedSeat) => {
  // 1. If it's already in your selected list, ALWAYS allow deselection first
  if (selectedSeatIds.includes(seat.id)) {
    setSelectedSeatIds(selectedSeatIds.filter(id => id !== seat.id));
    return;
  }

  // 2. Otherwise, only allow new selection if it's AVAILABLE
  if (seat.status !== 'AVAILABLE') return;

  setSelectedSeatIds([...selectedSeatIds, seat.id]);
};
  const handleCheckout = async () => {
    if (!selectedEvent) return;
    setMessage('Processing hold...');
    try {
      const response = await fetch('/api/v1/checkout/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `client-${Date.now()}`,
        },
        body: JSON.stringify({
          eventId: selectedEvent._id,
          seatIds: selectedSeatIds,
          userEmail,
        }),
      });

      const data = await response.json() as { success: boolean; message: string };
      setMessage(data.message);
      if (data.success) {
        setSelectedSeatIds([]);
        fetchSeats(selectedEvent._id);
      }
    } catch (error) {
      setMessage('Checkout failed due to network error.');
    }
  };

  // Group seats by row
  const groupedByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, CachedSeat[]>);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <h2>🎟️ Distributed Ticketing Engine</h2>

      {/* VIEW 1: HOME SCREEN (Event Discovery) */}
      {view === 'HOME' && (
        <div>
          <h3>Upcoming Events</h3>
          {events.length === 0 ? (
            <p>No events found. Did you run <code>npm run seed</code>?</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {events.map(ev => (
                <div 
                  key={ev._id} 
                  style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', background: '#fdfdfd' }}
                >
                  <h4>{ev.name}</h4>
                  <p style={{ margin: '0.2rem 0', color: '#555' }}>
                    📍 {ev.venueId?.name} ({ev.venueId?.city})
                  </p>
                  <p style={{ margin: '0.2rem 0', color: '#777', fontSize: '0.9rem' }}>
                    📅 {new Date(ev.date).toLocaleDateString()}
                  </p>
                  <button 
                    onClick={() => handleSelectEvent(ev)}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#007bff', color: '#white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Select Seats ➔
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SEAT SELECTION SCREEN */}
      {view === 'SEAT_SELECTION' && selectedEvent && (
        <div>
          <button 
            onClick={() => setView('HOME')}
            style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
          >
            ← Back to Events
          </button>

          <h3>{selectedEvent.name}</h3>
          <p style={{ color: '#555' }}>Venue: {selectedEvent.venueId?.name}</p>

          <div style={{ margin: '1rem 0' }}>
            <label><strong>User Email: </strong></label>
            <input 
              type="email" 
              value={userEmail} 
              onChange={e => setUserEmail(e.target.value)} 
              style={{ padding: '0.3rem', width: '250px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <span>🟢 Available</span>
            <span>🟡 Held</span>
            <span>🔴 Booked</span>
            <span>🔵 Selected</span>
          </div>

          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {Object.keys(groupedByRow).sort().map(rowKey => (
              <div key={rowKey} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                <span style={{ width: '20px', fontWeight: 'bold' }}>{rowKey}</span>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {groupedByRow[rowKey]?.sort((a, b) => a.number - b.number).map(seat => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    let bgColor = '#28a745';
                    if (seat.status === 'HELD') bgColor = '#ffc107';
                    if (seat.status === 'BOOKED') bgColor = '#dc3545';
                    if (isSelected) bgColor = '#007bff';

                    return (
                      <button
                        key={seat.id}
                        onClick={() => toggleSeatSelection(seat)}
                        disabled={seat.status !== 'AVAILABLE'}
                        style={{
                          width: '35px',
                          height: '35px',
                          background: bgColor,
                          color: 'white',
                          border: isSelected ? '2px solid #000' : 'none',
                          borderRadius: '4px',
                          cursor: seat.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

<div style={{ textAlign: 'center' }}>
            <button 
              onClick={handleCheckout} 
              disabled={selectedSeatIds.length === 0}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: selectedSeatIds.length > 0 ? '#007bff' : '#ccc', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: selectedSeatIds.length > 0 ? 'pointer' : 'not-allowed' 
              }}
            >
              Checkout Selected Seats ({selectedSeatIds.length})
            </button>
          </div>

          <p style={{ marginTop: '1rem', textAlign: 'center' }}><strong>Status:</strong> {message}</p>
        </div>
      )}
    </div>
  );
}