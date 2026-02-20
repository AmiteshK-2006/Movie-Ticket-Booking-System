-- TABLE: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);




-- TABLE: movies
CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT movies_duration_positive CHECK (duration_minutes > 0)
);



-- TABLE: seats
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    row VARCHAR(5) NOT NULL,
    seat_number INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT seats_number_positive CHECK (seat_number > 0),
    CONSTRAINT seats_unique_row_number UNIQUE (row, seat_number)
);

CREATE INDEX idx_seats_row ON seats(row);



-- TABLE: shows
CREATE TABLE shows (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_shows_movie 
        FOREIGN KEY (movie_id) 
        REFERENCES movies(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT shows_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX idx_shows_start_time ON shows(start_time);
CREATE INDEX idx_shows_movie_id ON shows(movie_id);



-- TABLE: bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    show_id INTEGER NOT NULL,
    total_seats INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_bookings_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_bookings_show 
        FOREIGN KEY (show_id) 
        REFERENCES shows(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT bookings_seats_limit CHECK (total_seats BETWEEN 1 AND 6),
    CONSTRAINT bookings_status_valid CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'))
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_show_status ON bookings(show_id, status);



-- TABLE: booking_seats (THE CRITICAL ONE)
CREATE TABLE booking_seats (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    show_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_booking_seats_booking 
        FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_booking_seats_show 
        FOREIGN KEY (show_id) 
        REFERENCES shows(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_booking_seats_seat 
        FOREIGN KEY (seat_id) 
        REFERENCES seats(id) 
        ON DELETE RESTRICT,
    
    -- THE MONEY CONSTRAINT: Prevents double booking
    CONSTRAINT booking_seats_unique_show_seat UNIQUE (show_id, seat_id)
);

CREATE INDEX idx_booking_seats_booking_id ON booking_seats(booking_id);



-- SAMPLE DATA
-- Insert movies
INSERT INTO movies (title, duration_minutes) VALUES
('Inception', 148),
('The Dark Knight', 152),
('Interstellar', 169);


-- Insert 120 seats (A1-J12)
INSERT INTO seats (row, seat_number)
SELECT 
    CHR(64 + r) as row,
    s as seat_number
FROM 
    generate_series(1, 10) r,
    generate_series(1, 12) s;



-- Insert shows
INSERT INTO shows (movie_id, start_time, end_time) VALUES
(1, '2024-03-15 18:00:00', '2024-03-15 20:45:00'),
(1, '2024-03-15 21:00:00', '2024-03-15 23:45:00'),
(2, '2024-03-15 18:30:00', '2024-03-15 21:15:00');



-- Insert sample user
INSERT INTO users (name, email, phone) VALUES
('John Doe', 'john@example.com', '1234567890');
