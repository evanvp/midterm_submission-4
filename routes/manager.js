const express = require('express');
const router = express.Router();


// Route to render the office management page
router.get('/main', (req, res, next) => {
    // Query to get the list of offices
    const officeQuery = "SELECT * FROM office";

    global.db.all(officeQuery, (err, offices) => {
        if (err) {
            return next(err);  // Pass error to the error handler middleware
        }

        res.render('Manager-main', { offices: offices });
    });
});


// Route to render the create office page
router.get('/create-office', (req, res) => {
    res.render('Manager-newOffice');
});

// Route to handle form submission
router.post('/create-office', (req, res, next) => {
    const { name, address, number_of_rooms } = req.body;

    // Input validation
    if (!name || !address || isNaN(number_of_rooms) || number_of_rooms < 1) {
        return res.status(400).send('Invalid input');
    }

    // Begin transaction
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Insert into office table
        const insertOfficeQuery = `
            INSERT INTO office (name, address, number_of_rooms)
            VALUES (?, ?, ?)`;

        db.run(insertOfficeQuery, [name, address, number_of_rooms], function(err) {
            if (err) {
                return db.run("ROLLBACK TRANSACTION", () => next(err));
            }

            const officeId = this.lastID;

            // Insert into room table
            const insertRoomQuery = `
                INSERT INTO room (office_id)
                VALUES (?)`;

            // Loop to insert the number of rooms
            for (let i = 0; i < number_of_rooms; i++) {
                db.run(insertRoomQuery, [officeId], (err) => {
                    if (err) {
                        return db.run("ROLLBACK TRANSACTION", () => next(err));
                    }
                });
            }

            // Commit transaction
            db.run("COMMIT TRANSACTION", (err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/manager/main');
            });
        });
    });
});


// Route to render reservations page
router.get('/view-reservations', (req, res, next) => {
    const selectedOfficeId = req.query.office_id || '';

    // Query to get the list of offices
    const officeQuery = "SELECT * FROM office";

    global.db.all(officeQuery, (err, offices) => {
        if (err) {
            return next(err);
        }

        // Query to get reservations
        // Join reservation, room, and office tables to get complete data
        let reservationQuery = `
            SELECT r.reservation_id, r.reservation_starttime, r.reservation_endtime, ro.room_id, o.name AS office_name
            FROM reservation r
            JOIN room ro ON r.room_id = ro.room_id
            JOIN office o ON ro.office_id = o.office_id
        `;

        // Filter by office if selected
        if (selectedOfficeId) {
            reservationQuery += ` WHERE o.office_id = ?`;
        }

        reservationQuery += ` ORDER BY r.reservation_id DESC`;

        global.db.all(reservationQuery, selectedOfficeId ? [selectedOfficeId] : [], (err, reservations) => {
            if (err) {
                return next(err);
            }

            // Render the reservations page with the list of offices and reservations
            res.render('Manager-viewReservations', {
                offices: offices,
                reservations: reservations,
                selectedOfficeId: selectedOfficeId
            });
        });
    });
});




module.exports = router;