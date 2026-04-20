import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, serverTimestamp, addDoc, updateDoc, deleteDoc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { initTeacherDashboard, doCheckIn } from './modules/teacher.js';
import { initAdminDashboard } from './modules/admin.js';
import { initManageTeachers } from './modules/manage-teachers.js';
import { initManageSlots } from './modules/manage-slots.js';
import { initManageLocations } from './modules/manage-locations.js';
import { initAnnouncements, loadTicker } from './modules/announcements.js';
import { initLeaveRequests } from './modules/leave-requests.js';
import { initReports } from './modules/reports.js';
import { initTimetable } from './modules/timetable.js';
import { initSubAdmin } from './modules/subadmin.js';
import { showToast, showModal, hideModal, setLoading, navigate } from './modules/ui-helpers.js';
import { detectFakeGPS } from './modules/anti-cheat.js';
import { getDeviceFingerprint } from './modules/device-fingerprint.js';
import { scheduleAutoLogout } from './modules/auto-logout.js';
export let currentUser = null;
export let currentProfile = null;
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('ijk-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateDarkBtn(savedTheme);
  onAuthStateChanged(auth, async (user) => {
    if (user) { await handleSignedIn(user); } else { handleSignedOut(); }
    document.getElementById('global-loader').classList.add('fade-out');
    document.getElementById('app').classList.remove('hidden');
  });
  bindLoginForm();
  bindNavEvents();
  bindGlobalEvents();
});
async function handleSignedIn(user) {
  currentUser = user;
  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  if (!profileSnap.exists()) { showToast('Account not found.', 'error'); await signOut(auth); return; }
  currentProfile = { id: user.uid, ...profileSnap.data() };
  if (currentProfile.status === 'blocked') { showToast('Account blocked.', 'error'); await signOut(auth); return; }
  const fingerprint = await getDeviceFingerprint();
  if (currentProfile.deviceFingerprint && currentProfile.deviceFingerprint !== fingerprint) { showToast('This account is linked to another device.', 'error'); await signOut(auth); return; }
  if (!currentProfile.deviceFingerprint) { await updateDoc(doc(db, 'users', user.uid), { deviceFingerprint: fingerprint }); }
  document.getElementById('top-nav').classList.remove('hidden');
  const initials = (currentProfile.name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('drawer-avatar').textContent = initials;
  document.getElementById('drawer-name').textContent = currentProfile.name || user.email;
  document.getElementById('drawer-role-badge').textContent = currentProfile.role || 'Teacher';
  hideLoginAnimation(); buildDrawerNav(currentProfile.role, currentProfile.permissions || []);
  loadTicker();
  initRefreshFeatures();
  const role = currentProfile.role;
  if (role === 'admin') { navigate('page-admin-dashboard'); initAdminDashboard(); }
  else { navigate('page-teacher-dashboard'); initTeacherDashboard(currentProfile); scheduleAutoLogout(currentProfile); }
}
function handleSignedOut() {
  currentUser = null; currentProfile = null;
  document.getElementById('top-nav').classList.add('hidden');
  navigate('page-login');
}
function bindLoginForm() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');
    errEl.classList.add('hidden');
    setLoading(btn, true);
    showLoginAnimation();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      hideLoginAnimation();
      errEl.textContent = friendlyAuthError(err.code);
      errEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  });
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });
}
function bindNavEvents() {
  document.getElementById('btn-menu').addEventListener('click', openDrawer);
  document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('btn-logout').addEventListener('click', async () => { await signOut(auth); showToast('Logged out.'); });
  document.getElementById('btn-dark-mode').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ijk-theme', next);
    updateDarkBtn(next);
  });
  document.addEventListener('click', (e) => {
    const back = e.target.closest('[data-back]');
    if (back) navigate(back.dataset.back);
    const qa = e.target.closest('[data-page]');
    if (qa) handlePageNav(qa.dataset.page);
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => { document.getElementById(btn.dataset.close)?.classList.add('hidden'); });
  });
}
function bindGlobalEvents() {
  document.getElementById('modal-close')?.addEventListener('click', hideModal);
  document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => { if (e.target === document.getElementById('modal-overlay')) hideModal(); });
}
function handlePageNav(pageId) {
  switch(pageId) {
    case 'page-manage-teachers': initManageTeachers(); break;
    case 'page-manage-slots': initManageSlots(); break;
    case 'page-manage-locations': initManageLocations(); break;
    case 'page-announcements': initAnnouncements(); break;
    case 'page-leave-requests': initLeaveRequests(); break;
    case 'page-reports': initReports(); break;
    case 'page-upload-timetable': initTimetable(); break;
    case 'page-subadmin': initSubAdmin(); break;
  }
  navigate(pageId);
}
function openDrawer() { document.getElementById('side-drawer').classList.add('open'); document.getElementById('drawer-overlay').classList.add('show'); }
function closeDrawer() { document.getElementById('side-drawer').classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('show'); }
function buildDrawerNav(role, permissions) {
  const nav = document.getElementById('drawer-nav');
  nav.innerHTML = '';
  const allItems = [
    { icon:'🏠', label:'Dashboard', page: role==='admin'?'page-admin-dashboard':'page-teacher-dashboard', roles:['admin','subadmin','teacher'] },
    { icon:'👥', label:'Teachers', page:'page-manage-teachers', roles:['admin'], perm:'manage_teachers' },
    { icon:'⏰', label:'Slots', page:'page-manage-slots', roles:['admin'], perm:'manage_slots' },
    { icon:'📍', label:'Locations', page:'page-manage-locations', roles:['admin'], perm:'manage_locations' },
    { icon:'📢', label:'Notices', page:'page-announcements', roles:['admin','subadmin'], perm:'announcements' },
    { icon:'🏖', label:'Leaves', page:'page-leave-requests', roles:['admin','subadmin'], perm:'leave_requests' },
    { icon:'📄', label:'Reports', page:'page-reports', roles:['admin','subadmin'], perm:'reports' },
    { icon:'🖼', label:'Timetable', page:'page-upload-timetable', roles:['admin'], perm:'timetable' },
    { icon:'🔑', label:'Sub-Admins', page:'page-subadmin', roles:['admin'] },
  ];
  allItems.forEach(item => {
    const allowed = item.roles.includes(role) || (role === 'subadmin' && item.perm && permissions.includes(item.perm));
    if (!allowed) return;
    const el = document.createElement('div');
    el.className = 'drawer-nav-item';
    el.innerHTML = `<span class="drawer-nav-icon">${item.icon}</span>${item.label}`;
    el.addEventListener('click', () => { closeDrawer(); handlePageNav(item.page); });
    nav.appendChild(el);
  });
}
function updateDarkBtn(theme) { document.getElementById('btn-dark-mode').textContent = theme === 'dark' ? '☀️' : '🌙'; }
function friendlyAuthError(code) {
  const map = { 'auth/invalid-credential':'Incorrect email or password.', 'auth/invalid-login-credentials':'Incorrect email or password.', 'auth/user-not-found':'No account found.', 'auth/wrong-password':'Incorrect password.', 'auth/invalid-email':'Invalid email.', 'auth/too-many-requests':'Too many attempts.', 'auth/network-request-failed':'Network error.', 'auth/user-disabled':'Account disabled.' };
  return map[code] || `Login failed. (${code})`;
}
function showLoginAnimation() {
  if (document.getElementById('login-anim-overlay')) return;
  const o = document.createElement('div');
  o.id = 'login-anim-overlay';
  o.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0d1b3e 0%,#1a3a6b 50%,#0d1b3e 100%);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
  o.innerHTML = '<style>@keyframes ijkP{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}@keyframes ijkS{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes ijkF{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}@keyframes ijkD{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}</style><div style="animation:ijkF 0.6s ease forwards;margin-bottom:36px;"><span style="font-size:60px;font-weight:900;color:#5b9cf6;display:inline-block;animation:ijkP 1.5s infinite;">I</span><span style="font-size:60px;font-weight:900;color:#fff;display:inline-block;animation:ijkP 1.5s 0.2s infinite;">J</span><span style="font-size:60px;font-weight:900;color:#1A73E8;display:inline-block;animation:ijkP 1.5s 0.4s infinite;">K</span></div><div style="width:64px;height:64px;border-radius:50%;border:4px solid rgba(255,255,255,0.1);border-top:4px solid #1A73E8;border-right:4px solid #5b9cf6;animation:ijkS 0.9s linear infinite;margin-bottom:32px;"></div><div style="color:#fff;font-size:17px;font-weight:600;margin-bottom:20px;">Signing you in...</div><div style="display:flex;gap:8px;"><span style="width:10px;height:10px;border-radius:50%;background:#1A73E8;display:block;animation:ijkD 1.4s infinite;"></span><span style="width:10px;height:10px;border-radius:50%;background:#5b9cf6;display:block;animation:ijkD 1.4s 0.2s infinite;"></span><span style="width:10px;height:10px;border-radius:50%;background:#1A73E8;display:block;animation:ijkD 1.4s 0.4s infinite;"></span></div><div style="position:absolute;bottom:40px;color:rgba(255,255,255,0.2);font-size:11px;letter-spacing:3px;">IJK SMART ATTENDANCE PRO</div>';
  document.body.appendChild(o);
}
function hideLoginAnimation() { const o = document.getElementById('login-anim-overlay'); if (o) o.remove(); }
function initRefreshFeatures() {
  if (document.getElementById('global-refresh-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'global-refresh-btn';
  btn.innerHTML = '↻';
  btn.style.cssText = 'position:fixed;bottom:24px;right:20px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#1A73E8,#0d47a1);color:#fff;font-size:24px;border:none;cursor:pointer;z-index:9000;box-shadow:0 4px 20px rgba(26,115,232,0.5);display:flex;align-items:center;justify-content:center;transition:transform 0.5s ease;';
  btn.addEventListener('click', () => { btn.style.transform='rotate(360deg)'; setTimeout(()=>{btn.style.transition='none';btn.style.transform='rotate(0)';setTimeout(()=>{btn.style.transition='transform 0.5s ease';},50);},500); window.location.reload(); });
  document.body.appendChild(btn);
  let startY=0,pulling=false,indicator=null;
  document.addEventListener('touchstart',(e)=>{if(window.scrollY===0){startY=e.touches[0].clientY;pulling=true;}},{passive:true});
  document.addEventListener('touchmove',(e)=>{if(!pulling)return;const diff=e.touches[0].clientY-startY;if(diff>10&&diff<130){if(!indicator){indicator=document.createElement('div');indicator.style.cssText='position:fixed;top:0;left:0;width:100%;display:flex;align-items:center;justify-content:center;padding:14px;background:linear-gradient(135deg,#1A73E8,#0d47a1);color:#fff;font-size:13px;font-weight:600;z-index:9999;';document.body.appendChild(indicator);}indicator.innerHTML=diff>80?'⬆️ Release to refresh':'⬇️ Pull to refresh';}},{passive:true});
  document.addEventListener('touchend',(e)=>{if(!pulling)return;pulling=false;const diff=e.changedTouches[0].clientY-startY;if(indicator){indicator.remove();indicator=null;}if(diff>80){showToast('Refreshing...','info');setTimeout(()=>window.location.reload(),500);}},{passive:true});
}
export { db, auth, storage, doc, getDoc, onSnapshot, collection, query, where, orderBy, serverTimestamp, addDoc, updateDoc, deleteDoc, getDocs, setDoc, ref, uploadBytesResumable, getDownloadURL, showToast, showModal, hideModal, navigate, setLoading };


// Back Button
import('https://unpkg.com/@capacitor/app@5.0.6/dist/esm/index.js').then(({ App }) => {
  App.addListener('backButton', () => {
    const exitOverlay = document.getElementById('exit-overlay');
    if (exitOverlay) return;
    const modalOverlay = document.getElementById('modal-overlay');
    const leaveModal = document.getElementById('leave-modal');
    const drawer = document.getElementById('side-drawer');
    if (!modalOverlay.classList.contains('hidden')) { document.getElementById('modal-close').click(); return; }
    if (!leaveModal.classList.contains('hidden')) { leaveModal.classList.add('hidden'); return; }
    if (drawer.classList.contains('open')) { drawer.classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('show'); return; }
    showExitDialog();
  });
}).catch(() => {});

function showExitDialog() {
  if (document.getElementById('exit-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'exit-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  overlay.innerHTML = '<div style="background:#1C2538;border-radius:20px;padding:28px 24px;margin:20px;max-width:320px;width:100%;border:1px solid rgba(255,255,255,0.1);text-align:center;"><div style="font-size:48px;margin-bottom:16px;">👋</div><div style="font-size:18px;font-weight:700;color:#ffffff;margin-bottom:8px;">Exit App?</div><div style="font-size:14px;color:#9aa5be;margin-bottom:24px;">Are you sure you want to exit IJK Attendance Pro?</div><div style="display:flex;gap:12px;"><button id="exit-cancel" style="flex:1;padding:12px;border-radius:12px;border:none;background:rgba(255,255,255,0.08);color:#ffffff;font-size:14px;font-weight:600;cursor:pointer;">Stay</button><button id="exit-confirm" style="flex:1;padding:12px;border-radius:12px;border:none;background:#1A73E8;color:#ffffff;font-size:14px;font-weight:600;cursor:pointer;">Exit</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('exit-cancel').onclick = () => overlay.remove();
  document.getElementById('exit-confirm').onclick = () => {
    import('https://unpkg.com/@capacitor/app@5.0.6/dist/esm/index.js').then(({ App }) => App.exitApp()).catch(() => {});
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
