<div align="center">

# IJK Smart Attendance Pro

**GPS-based attendance app built for the teachers and admins of IJK Coaching Center, Karachi.**

[![Live app](https://img.shields.io/badge/Live_app-connectabdullahdev.github.io%2Fijk--smart--attendance--pro-0F3740?style=for-the-badge)](https://connectabdullahdev.github.io/ijk-smart-attendance-pro/)

![JavaScript](https://img.shields.io/badge/JavaScript_(ES_modules)-F7DF1E?logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Auth_·_Firestore_·_Storage-FFCA28?logo=firebase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Service_Worker-5A0FC8?logo=pwa&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor&logoColor=white)

</div>

## About

Built for IJK Coaching Center so teachers can mark attendance from their phones, with every check-in tied to the center's location and to a single device, and so admins can manage slots, leave and monthly reports in one place.

## Features

**For teachers**
- Check in from their phone inside the center's GPS radius
- Apply for leave and follow the status of each request
- See announcements on a live board

**For admins**
- Admin command center with the day's attendance at a glance
- Manage teachers, sub-admins, time slots and GPS locations
- Upload the timetable
- Approve or reject leave requests
- Attendance reports with **PDF** and **Excel** export
- Post announcements

**Anti-cheat and reliability**
- Fake GPS / mock location detection
- Device fingerprinting, so one account works on one device only
- Offline support through a service worker and Firestore's IndexedDB cache
- Installable as a PWA, and packaged for Android with Capacitor
- Dark and light mode

## Tech stack

| Area | Tools |
| --- | --- |
| App | Vanilla JavaScript (ES modules), HTML, CSS |
| Backend | Firebase Authentication, Cloud Firestore, Firebase Storage |
| Offline | Service worker (`sw.js`), Firestore persistence |
| Mobile | PWA manifest, Capacitor (Android) |

## Run it locally

```bash
git clone https://github.com/connectabdullahdev/ijk-smart-attendance-pro.git
cd ijk-smart-attendance-pro
npx serve .
```

To point it at your own Firebase project, replace the config in `firebase-config.js`. Firebase web config values are meant to be public; access is controlled by Firestore and Storage security rules.

---

<div align="center">

Built by **Muhammad Abdullah** for IJK Coaching Center · [LinkedIn](https://www.linkedin.com/in/connectabdullahdev) · [GitHub](https://github.com/connectabdullahdev)

</div>
