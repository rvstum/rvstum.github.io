import { state, getRuntimeAccountId } from "./appState.js";
import { t, tf } from "./i18n.js";
import * as UserService from "./userService.js?v=20260309-request-directory-1";
import * as Slugs from "./slugs.js";
import { updateProfile, signOut, verifyBeforeUpdateEmail, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { compressImageFileToDataUrl } from "./imageUtils.js";
import {
    readString,
    readJson,
    writeString,
    writeJson,
    removeItem,
    PROFILE_PIC_STORAGE_KEY,
    COUNTRY_FLAG_STORAGE_KEY,
    PROFILE_PIC_ORIGINAL_STORAGE_KEY,
    GUILDS_STORAGE_KEY,
    PROFILE_PIC_STATE_STORAGE_KEY
} from "./storage.js";
import { escapeHtml, getFlagUrl } from "./utils.js";
import { getCachedElementById, getCachedQuery, setHidden, setFlexVisible } from "./utils/domUtils.js";

// Cropper state
let cropperState = { x: 0, y: 0, scale: 1 };
let isDragging = false;
let startX, startY;
let currentUserEmail = 'Player@gmail.com';

export function setCurrentUserEmail(email) {
    currentUserEmail = email;
}

export let originalProfileState = {};
export let draftProfileState = {};
export let editingGuilds = [];
export let editingGuildIndex = -1;

const MAX_PROFILE_GUILDS = 6;

const FLAGS = [
    { code: 'us', label: 'English' },
    { code: 'sa', label: 'Arabic' },
    { code: 'bd', label: 'Bangla' },
    { code: 'dk', label: 'Danish' },
    { code: 'de', label: 'German' },
    { code: 'es', label: 'Spanish' },
    { code: 'ph', label: 'Filipino' },
    { code: 'fr', label: 'French' },
    { code: 'hmn', label: 'Hmong' },
    { code: 'id', label: 'Indonesian' },
    { code: 'it', label: 'Italian' },
    { code: 'hu', label: 'Hungarian' },
    { code: 'my', label: 'Malay' },
    { code: 'nl', label: 'Dutch' },
    { code: 'no', label: 'Norwegian' },
    { code: 'pl', label: 'Polish' },
    { code: 'br', label: 'Portuguese (BR)' },
    { code: 'pt', label: 'Portuguese (PT)' },
    { code: 'fi', label: 'Finnish' },
    { code: 'se', label: 'Swedish' },
    { code: 'vn', label: 'Vietnamese' },
    { code: 'tr', label: 'Turkish' },
    { code: 'cn', label: 'Chinese' },
    { code: 'jp', label: 'Japanese' },
    { code: 'kr', label: 'Korean' }
];

function getCachedProfileElementById(id) {
    return getCachedElementById(id);
}

function getCachedProfileQuery(key, resolver) {
    return getCachedQuery(`profileUI:${key}`, resolver);
}

function getSlugAccountId() {
    const accountIdDisplay = getCachedElementById("accountIdDisplay");
    const fromDataset = accountIdDisplay && accountIdDisplay.dataset
        ? (accountIdDisplay.dataset.realValue || "").trim()
        : "";
    return fromDataset || getRuntimeAccountId();
}

function normalizeGuildList(guilds) {
    return (Array.isArray(guilds) ? guilds : [])
        .map((guild) => String(guild || "").trim())
        .filter(Boolean)
        .slice(0, MAX_PROFILE_GUILDS);
}

function syncGuildAddButtonsVisibility(explicitAddGuildBtn = null) {
    const atMaxGuilds = editingGuilds.length >= MAX_PROFILE_GUILDS;
    const buttons = Array.from(new Set([
        explicitAddGuildBtn,
        getCachedProfileElementById("addGuildBtn"),
        getCachedProfileElementById("onboardingAddGuildBtn")
    ].filter(Boolean)));

    buttons.forEach((button) => {
        setHidden(button, atMaxGuilds);
    });

    const profileNewGuildInputBox = getCachedProfileElementById("newGuildInputBox");
    if (profileNewGuildInputBox && atMaxGuilds) {
        setHidden(profileNewGuildInputBox, true);
    }

    const onboardingAddGuildRow = getCachedProfileElementById("onboardingAddGuildRow");
    if (onboardingAddGuildRow) {
        setHidden(onboardingAddGuildRow, atMaxGuilds);
    }
}

function getProfileNameElement() {
    return getCachedProfileQuery("profileName", () => document.querySelector(".profile-name"));
}

function getProfileContentElement() {
    return getCachedProfileQuery("profileContent", () => document.querySelector(".profile-content"));
}

function getGuildNameElement() {
    return getCachedProfileQuery("guildName", () => document.querySelector(".guild-name"));
}

function getProfileCircleElement() {
    return getCachedProfileQuery("profileCircle", () => document.querySelector(".profile-circle"));
}

function getNationalityFlagElement() {
    return getCachedProfileQuery("nationalityFlag", () => document.querySelector(".nationality-flag"));
}

function getUserMenuAvatarElement() {
    return getCachedProfileQuery("userMenuAvatarIcon", () => document.querySelector("#userMenuBox .user-menu-avatar-placeholder"));
}

function getUserMenuWrapperElement() {
    return getCachedProfileQuery("userMenuWrapper", () => document.querySelector(".user-menu-wrapper"));
}

function updateCropperTransform(cropperImage) {
    if (!cropperImage) return;
    cropperImage.style.transform = `translate(${cropperState.x}px, ${cropperState.y}px) scale(${cropperState.scale})`;
}

function getCroppedImage(cropperImage) {
    if (!cropperImage || !cropperImage.src) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 120;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(60, 60);
    ctx.translate(cropperState.x, cropperState.y);
    ctx.scale(cropperState.scale, cropperState.scale);
    ctx.drawImage(cropperImage, -cropperImage.naturalWidth / 2, -cropperImage.naturalHeight / 2);
    return canvas.toDataURL('image/png');
}

export async function initProfileModalState(profileModal, accountEmailDisplay, toggleEmailView, currentUserEmail, cropperContainer, profilePicInput, cropperImage, newGuildInputBox, addGuildBtn) {
    const user = auth.currentUser;
    if (user) {
        try {
            await user.reload();
            currentUserEmail = user.email;
            
            if (accountEmailDisplay) {
                const parts = user.email.split('@');
                const masked = `**************@${parts[1] || 'gmail.com'}`;
                if (toggleEmailView && toggleEmailView.textContent === t('hide')) {
                    accountEmailDisplay.value = currentUserEmail;
                } else {
                    accountEmailDisplay.value = masked;
                }
            }

            if (user.displayName) {
                 const profileName = getProfileNameElement();
                 if (profileName) profileName.textContent = user.displayName;
                 const userMenuName = getCachedProfileElementById('userMenuUsername');
                 if (userMenuName) userMenuName.textContent = user.displayName;
            }
        } catch (e) {
            console.error("Error reloading user:", e);
        }
    }

    const profileName = getProfileNameElement();
    const savedUsername = profileName ? profileName.textContent : '';
    const savedPic = readString(PROFILE_PIC_STORAGE_KEY, '');
    const savedFlag = readString(COUNTRY_FLAG_STORAGE_KEY, '');
    const savedOriginalPic = readString(PROFILE_PIC_ORIGINAL_STORAGE_KEY, '');
    const rawSavedGuilds = readJson(GUILDS_STORAGE_KEY, []);
    const savedGuilds = normalizeGuildList(rawSavedGuilds);
    const rawSavedCropState = readJson(PROFILE_PIC_STATE_STORAGE_KEY, null);
    const savedCropState = (rawSavedCropState && typeof rawSavedCropState === 'object' && !Array.isArray(rawSavedCropState))
        ? rawSavedCropState
        : null;

    originalProfileState = {
        username: savedUsername,
        pic: savedPic,
        flag: savedFlag,
        originalPic: savedOriginalPic,
        guilds: [...savedGuilds],
        cropState: savedCropState
    };

    draftProfileState = {
        username: savedUsername,
        pic: savedPic,
        flag: savedFlag,
        originalPic: savedOriginalPic,
        cropState: savedCropState ? { ...savedCropState } : null
    };
    editingGuilds = [...savedGuilds];
    editingGuildIndex = -1;

    const usernameInput = getCachedProfileElementById('profileUsernameInput');
    if (usernameInput) usernameInput.value = draftProfileState.username;

    updateProfilePicPreview(draftProfileState.pic);
    updateFlagPreview(draftProfileState.flag);
    renderGuildsList(addGuildBtn);
    
    if (newGuildInputBox) setHidden(newGuildInputBox, true);
    if (addGuildBtn) setHidden(addGuildBtn, editingGuilds.length >= 6);

    if (cropperContainer) setHidden(cropperContainer, true);
    if (profilePicInput) profilePicInput.value = '';
    if (cropperImage) {
        cropperImage.removeAttribute('src');
        delete cropperImage.dataset.originalSrc;
    }

    updateProfileButtons();
    profileModal.classList.add('show');

    const content = getProfileContentElement();
    if (content) content.scrollTop = 0;
}

export function cleanProfileData(draft, guilds) {
    const cleanGuilds = normalizeGuildList(guilds);
    
    const profileData = {};
    
    if (cleanGuilds.length > 0) {
        profileData.guilds = cleanGuilds;
    }
    
    if (draft.flag) {
        profileData.flag = draft.flag;
    }
    
    if (draft.pic) {
        profileData.pic = draft.pic;
    }
    
    if (draft.originalPic) {
        profileData.originalPic = draft.originalPic;
    }
    
    if (draft.cropState && typeof draft.cropState === 'object') {
        profileData.cropState = {
            x: Number(draft.cropState.x) || 0,
            y: Number(draft.cropState.y) || 0,
            scale: Number(draft.cropState.scale) || 1
        };
    }

    return profileData;
}

export function updateProfilePicPreview(picUrl) {
    const profilePreviewCircle = getCachedProfileElementById('profilePreviewCircle');
    const profilePreviewBox = getCachedProfileElementById('profilePreviewBox');
    const onboardingProfilePreviewCircle = getCachedProfileElementById('onboardingProfilePreviewCircle');
    const uploadProfilePicBtn = getCachedProfileElementById('uploadProfilePicBtn');
    const onboardingUploadProfilePicBtn = getCachedProfileElementById('onboardingUploadProfilePicBtn');
    const editProfilePicBtn = getCachedProfileElementById('editProfilePicBtn');
    const removeProfilePicBtn = getCachedProfileElementById('removeProfilePicBtn');
    const onboardingEditProfilePicBtn = getCachedProfileElementById('onboardingEditProfilePicBtn');
    const onboardingRemoveProfilePicBtn = getCachedProfileElementById('onboardingRemoveProfilePicBtn');

    if (picUrl) {
        if (profilePreviewCircle) profilePreviewCircle.style.backgroundImage = `url(${picUrl})`;
        if (profilePreviewBox) profilePreviewBox.style.backgroundImage = `url(${picUrl})`;
        if (onboardingProfilePreviewCircle) onboardingProfilePreviewCircle.style.backgroundImage = `url(${picUrl})`;
        if (uploadProfilePicBtn) uploadProfilePicBtn.textContent = t('replace_image');
        if (onboardingUploadProfilePicBtn) onboardingUploadProfilePicBtn.textContent = t('replace_image');
        if (editProfilePicBtn) setHidden(editProfilePicBtn, false);
        if (removeProfilePicBtn) setHidden(removeProfilePicBtn, false);
        if (onboardingEditProfilePicBtn) setHidden(onboardingEditProfilePicBtn, false);
        if (onboardingRemoveProfilePicBtn) setHidden(onboardingRemoveProfilePicBtn, false);
    } else {
        if (profilePreviewCircle) profilePreviewCircle.style.backgroundImage = '';
        if (profilePreviewBox) profilePreviewBox.style.backgroundImage = '';
        if (onboardingProfilePreviewCircle) onboardingProfilePreviewCircle.style.backgroundImage = '';
        if (uploadProfilePicBtn) uploadProfilePicBtn.textContent = t('upload_image');
        if (onboardingUploadProfilePicBtn) onboardingUploadProfilePicBtn.textContent = t('upload_image');
        if (editProfilePicBtn) setHidden(editProfilePicBtn, true);
        if (removeProfilePicBtn) setHidden(removeProfilePicBtn, true);
        if (onboardingEditProfilePicBtn) setHidden(onboardingEditProfilePicBtn, true);
        if (onboardingRemoveProfilePicBtn) setHidden(onboardingRemoveProfilePicBtn, true);
    }
}

export function updateFlagPreview(code) {
    const flagSelectorBox = getCachedProfileElementById('flagSelectorBox');
    const removeFlagBtn = getCachedProfileElementById('removeFlagBtn');
    const onboardingFlagSelectorBox = getCachedProfileElementById('onboardingFlagSelectorBox');

    if (flagSelectorBox) {
        if (code) {
            flagSelectorBox.textContent = '';
            flagSelectorBox.style.backgroundImage = `url(${getFlagUrl(code)})`;
            if (removeFlagBtn) setHidden(removeFlagBtn, false);
            if (onboardingFlagSelectorBox) onboardingFlagSelectorBox.style.backgroundImage = `url(${getFlagUrl(code)})`;
        } else {
            flagSelectorBox.style.backgroundImage = '';
            if (removeFlagBtn) setHidden(removeFlagBtn, true);
            if (onboardingFlagSelectorBox) onboardingFlagSelectorBox.style.backgroundImage = '';
        }
    }
}

export function updateProfileButtons() {
    const saveBtn = getCachedProfileElementById('saveProfileBtn');
    const discardBtn = getCachedProfileElementById('discardProfileBtn');
    
    const guildsChanged = JSON.stringify(editingGuilds) !== JSON.stringify(originalProfileState.guilds);
    const usernameChanged = draftProfileState.username !== originalProfileState.username;
    const picChanged = draftProfileState.pic !== originalProfileState.pic;
    const flagChanged = draftProfileState.flag !== originalProfileState.flag;

    const hasChanges = guildsChanged || usernameChanged || picChanged || flagChanged;

    if (saveBtn) saveBtn.classList.toggle('profile-action-visible', hasChanges);
    if (discardBtn) discardBtn.classList.toggle('profile-action-visible', hasChanges);
}

export function renderGuildsList(addGuildBtn) {
    editingGuilds = normalizeGuildList(editingGuilds);
    if (editingGuildIndex >= editingGuilds.length) editingGuildIndex = -1;

    const guildListContainer = getCachedProfileElementById('guildListContainer');
    const onboardingGuildListContainer = getCachedProfileElementById('onboardingGuildListContainer');
    const containers = [guildListContainer, onboardingGuildListContainer];
    
    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        setFlexVisible(container, editingGuilds.length > 0);
        
    editingGuilds.forEach((guild, index) => {
        const div = document.createElement('div');
        div.className = 'guild-item';
        
        const dragHandleHtml = `
            <div class="guild-drag-handle" title="${escapeHtml(t('drag_to_reorder'))}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg>
            </div>
        `;
        
        if (index === editingGuildIndex) {
            div.classList.add('editing');
            div.innerHTML = `
                <div class="guild-left-content">
                    ${dragHandleHtml}
                    <input type="text" class="settings-select guild-edit-input" value="${escapeHtml(guild)}" maxlength="20">
                </div>
                <div class="guild-item-actions">
                    <button class="guild-action-btn save">${escapeHtml(t('save'))}</button>
                    <button class="guild-action-btn cancel">${escapeHtml(t('cancel'))}</button>
                </div>
            `;
            const input = div.querySelector('input');
            const saveBtn = div.querySelector('.save');
            const cancelBtn = div.querySelector('.cancel');

            const save = () => {
                const val = input.value.trim();
                if (val) {
                    editingGuilds[index] = val;
                    editingGuildIndex = -1;
                    renderGuildsList(addGuildBtn);
                    updateProfileButtons();
                }
            };

            saveBtn.addEventListener('click', save);
            cancelBtn.addEventListener('click', () => {
                editingGuildIndex = -1;
                renderGuildsList(addGuildBtn);
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') {
                    editingGuildIndex = -1;
                    renderGuildsList(addGuildBtn);
                }
            });
            
            setTimeout(() => {
                input.focus();
                const end = input.value.length;
                try {
                    input.setSelectionRange(end, end);
                } catch (e) {}
            }, 0);
        } else {
            div.innerHTML = `
                <div class="guild-left-content">
                    ${dragHandleHtml}
                    <span class="guild-item-name">${escapeHtml(guild)}</span>
                </div>
                <div class="guild-item-actions">
                    <button class="guild-action-btn edit">${escapeHtml(t('edit'))}</button>
                    <button class="guild-action-btn remove">${escapeHtml(t('remove'))}</button>
                </div>
            `;
            div.querySelector('.edit').addEventListener('click', () => {
                editingGuildIndex = index;
                renderGuildsList(addGuildBtn);
            });
            div.querySelector('.remove').addEventListener('click', () => {
                editingGuilds.splice(index, 1);
                if (editingGuildIndex === index) editingGuildIndex = -1;
                else if (editingGuildIndex > index) editingGuildIndex--;
                renderGuildsList(addGuildBtn);
                updateProfileButtons();
            });
        }
        
        const handle = div.querySelector('.guild-drag-handle');
        if (handle) {
            handle.addEventListener('pointerdown', (e) => {
                handleGuildDragStart(e, div, addGuildBtn);
            });
        }
        
        container.appendChild(div);
    });
    });

    syncGuildAddButtonsVisibility(addGuildBtn);
}

let dragAvatar = null;
let dragPlaceholder = null;
let dragOffsetY = 0;
let dragOffsetX = 0;
let isPointerDragging = false;
let dragContainer = null;

export function handleGuildDragStart(e, item, addGuildBtn) {
    if (e.button !== 0) return;
    e.preventDefault();
    
    const rect = item.getBoundingClientRect();
    dragOffsetY = e.clientY - rect.top;
    dragOffsetX = e.clientX - rect.left;
    
    item.style.setProperty('--drag-width', `${rect.width}px`);
    
    dragAvatar = item.cloneNode(true);
    dragAvatar.classList.add('sortable-drag');
    const origInput = item.querySelector('input');
    const avatarInput = dragAvatar.querySelector('input');
    if (origInput && avatarInput) avatarInput.value = origInput.value;
    
    dragAvatar.style.left = `${rect.left}px`;
    dragAvatar.style.top = `${rect.top}px`;
    document.body.appendChild(dragAvatar);
    
    item.classList.add('sortable-ghost');
    dragPlaceholder = item;
    dragContainer = item.parentElement;
    
    isPointerDragging = true;
    
    const moveHandler = (ev) => handleGuildDragMove(ev);
    const endHandler = (ev) => handleGuildDragEnd(ev, moveHandler, endHandler, addGuildBtn);

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', endHandler);
    document.addEventListener('pointercancel', endHandler);
}

export function handleGuildDragMove(e) {
    if (!isPointerDragging || !dragAvatar || !dragContainer) return;
    e.preventDefault();
    
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;
    
    dragAvatar.style.left = `${x}px`;
    dragAvatar.style.top = `${y}px`;
    
    const container = dragContainer;
    const siblings = [...container.querySelectorAll('.guild-item:not(.sortable-drag)')];
    const afterElement = getDragAfterElement(container, e.clientY);
    
    if (afterElement !== dragPlaceholder.nextElementSibling && afterElement !== dragPlaceholder) {
        const positions = new Map();
        siblings.forEach(el => positions.set(el, el.getBoundingClientRect().top));
        
        if (afterElement == null) {
            container.appendChild(dragPlaceholder);
        } else {
            container.insertBefore(dragPlaceholder, afterElement);
        }
        
        siblings.forEach(el => {
            const newTop = el.getBoundingClientRect().top;
            const oldTop = positions.get(el);
            if (oldTop === undefined) return;
            const delta = oldTop - newTop;
            if (delta !== 0) {
                el.style.transition = 'none';
                el.style.transform = `translateY(${delta}px)`;
                void el.offsetHeight;
                el.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.3, 1)';
                el.style.transform = '';
            }
        });
    }
}

export function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.guild-item:not(.sortable-ghost):not(.sortable-drag)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export function handleGuildDragEnd(e, moveHandler, endHandler, addGuildBtn) {
    if (!isPointerDragging) return;
    isPointerDragging = false;
    
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', endHandler);
    document.removeEventListener('pointercancel', endHandler);
    
    if (dragAvatar) {
        dragAvatar.remove();
        dragAvatar = null;
    }
    
    const container = dragContainer;
    if (dragPlaceholder) dragPlaceholder.classList.remove('sortable-ghost');
    dragPlaceholder = null;
    dragContainer = null;
    
    const newGuilds = [];
    if (container) {
        const items = container.querySelectorAll('.guild-item');
        items.forEach(item => {
            const input = item.querySelector('input');
            const span = item.querySelector('.guild-item-name');
            if (input) newGuilds.push(input.value.trim());
            else if (span) newGuilds.push(span.textContent.trim());
        });
    }
    
    editingGuilds = normalizeGuildList(newGuilds);
    editingGuildIndex = -1;
    
    renderGuildsList(addGuildBtn);
    updateProfileButtons();
}

export function updateMainPageGuildDisplay() {
    const guildNameEl = getGuildNameElement();
    if (!guildNameEl) return;
    
    const savedGuilds = readJson(GUILDS_STORAGE_KEY, []);
    const guilds = Array.isArray(savedGuilds) ? savedGuilds : [];

    if (guilds.length > 0) {
        guildNameEl.textContent = guilds.map(g => `(${g})`).join(' ');
        setHidden(guildNameEl, false);
    } else {
        setHidden(guildNameEl, true);
    }
}

export function renderFlags(flagGrid, flagModal, closeFlagPicker) {
    if (!flagGrid) return;
    flagGrid.innerHTML = '';
    FLAGS.forEach(flag => {
        const div = document.createElement('div');
        div.className = 'flag-option';
        div.style.backgroundImage = `url(${getFlagUrl(flag.code)})`;
        div.title = flag.label;
        div.addEventListener('click', () => {
            handleFlagSelection(flag.code);
            closeFlagPicker();
        });
        flagGrid.appendChild(div);
    });
}

export function setFlag(code) {
    if (code) writeString(COUNTRY_FLAG_STORAGE_KEY, code);
    else removeItem(COUNTRY_FLAG_STORAGE_KEY);
    updateMainHeaderLayout();
}

export function handleFlagSelection(code) {
    draftProfileState.flag = code;
    updateFlagPreview(code);
    updateProfileButtons();
}

export function closeFlagPicker(flagModal) {
    if (!flagModal) return;
    flagModal.classList.add('closing');
    setTimeout(() => {
        flagModal.classList.remove('show');
        flagModal.classList.remove('closing');
    }, 200);
}

export function updateMainHeaderLayout() {
    const pic = readString(PROFILE_PIC_STORAGE_KEY, '');
    const flag = readString(COUNTRY_FLAG_STORAGE_KEY, '');
    
    const circle = getProfileCircleElement();
    const flagEl = getNationalityFlagElement();
    const userMenuBoxIcon = getUserMenuAvatarElement();
    const userMenuBox = getCachedProfileElementById('userMenuBox');
    const userMenuWrapper = getUserMenuWrapperElement();

    if (!circle || !flagEl) return;

    circle.className = 'profile-circle';
    circle.style.backgroundImage = '';
    circle.classList.remove('is-hidden');
    flagEl.classList.remove('is-hidden');
    flagEl.classList.add('is-flex');

    if (pic) {
        circle.style.backgroundImage = `url(${pic})`;
        circle.style.backgroundSize = 'cover';
        circle.style.backgroundColor = 'transparent';
        if (userMenuBox) userMenuBox.classList.remove('user-menu-box--no-avatar');
        if (userMenuWrapper) userMenuWrapper.classList.remove('user-menu-wrapper--no-avatar');
        if (userMenuBoxIcon) {
            userMenuBoxIcon.style.backgroundImage = `url(${pic})`;
            userMenuBoxIcon.style.backgroundSize = 'cover';
            userMenuBoxIcon.style.backgroundColor = 'transparent';
        }
    } else {
        circle.style.backgroundColor = 'transparent';
        circle.style.border = 'none';
        if (userMenuBox) userMenuBox.classList.add('user-menu-box--no-avatar');
        if (userMenuWrapper) userMenuWrapper.classList.add('user-menu-wrapper--no-avatar');
        if (userMenuBoxIcon) {
            userMenuBoxIcon.style.backgroundImage = '';
            userMenuBoxIcon.style.backgroundColor = '#0a0a0a';
        }
        
        if (flag) {
            circle.classList.add('no-pic-has-flag');
        } else {
            circle.classList.add('is-hidden');
        }
    }

    if (flag) {
        flagEl.textContent = '';
        flagEl.style.backgroundImage = `url(${getFlagUrl(flag)})`;
    } else {
        flagEl.classList.add('is-hidden');
    }
    syncUserMenuDropdownWidth();
}

export function restructureHighlightsLayout() {
    const highlightsGrid = getCachedProfileElementById('highlightsGrid');
    if (!highlightsGrid) return;
    const highlightsBox = highlightsGrid.closest('.highlights-box');
    if (!highlightsBox) return;
    highlightsBox.classList.add('highlights-ready');
}

export function setupVerticalBoxClasses() {
    const verticalBoxes = document.querySelectorAll('.vertical-box');
    verticalBoxes.forEach((box, index) => {
        box.classList.add(`vbox-${index + 1}`);
        const icon = box.querySelector('img');
        if (!icon) return;
        icon.classList.add('vertical-box-icon');
        const src = (icon.getAttribute('src') || '').toLowerCase();
        if (src.includes('sword')) icon.classList.add('vertical-box-icon-swords');
        if (src.includes('bomb')) icon.classList.add('vertical-box-icon-bombs');
    });
}

export function syncUserMenuDropdownWidth() {
    const box = getCachedProfileElementById('userMenuBox');
    if (!box) return;
    const menu = getCachedProfileQuery('userMenuDropdown', () => box.querySelector('.dropdown-menu'));
    if (!menu) return;
    const boxWidth = Math.ceil(box.getBoundingClientRect().width || box.offsetWidth || 0);
    const target = Math.max(1, boxWidth);
    menu.style.width = `${target}px`;
    menu.style.minWidth = `${target}px`;
    menu.style.maxWidth = `${target}px`;
}

export function initOnboarding(onboardingModal, onboardingUsernameInput, addGuildBtn) {
    if (!onboardingModal) return;
    
    draftProfileState = {
        username: '',
        pic: null,
        flag: null,
        originalPic: null,
        cropState: null
    };
    editingGuilds = [];
    
    if (onboardingUsernameInput) onboardingUsernameInput.value = '';
    updateProfilePicPreview(null);
    updateFlagPreview(null);
    renderGuildsList(addGuildBtn);
    
    onboardingModal.classList.add('show');
}

export async function saveOnboardingProfile(usernameRaw) {
    const username = String(usernameRaw || '').trim();
    if (!username) {
        throw new Error(t('onboarding_username_required'));
    }

    const user = auth.currentUser;
    if (!user) {
        throw new Error('No authenticated user.');
    }

    await updateProfile(user, { displayName: username });

    const profileNameEl = getProfileNameElement();
    if (profileNameEl) profileNameEl.textContent = username;
    const userMenuName = getCachedProfileElementById('userMenuUsername');
    if (userMenuName) userMenuName.textContent = username;

    if (draftProfileState.pic) writeString(PROFILE_PIC_STORAGE_KEY, draftProfileState.pic);
    if (draftProfileState.flag) writeString(COUNTRY_FLAG_STORAGE_KEY, draftProfileState.flag);
    if (draftProfileState.originalPic) writeString(PROFILE_PIC_ORIGINAL_STORAGE_KEY, draftProfileState.originalPic);
    if (draftProfileState.cropState) writeJson(PROFILE_PIC_STATE_STORAGE_KEY, draftProfileState.cropState);
    writeJson(GUILDS_STORAGE_KEY, editingGuilds);

    updateMainPageGuildDisplay();
    updateMainHeaderLayout();

    const profileData = cleanProfileData(draftProfileState, editingGuilds);
    const accountIdForSlug = getSlugAccountId();
    const publicSlug = Slugs.buildProfileSlug(username, accountIdForSlug, user.uid);

    await setDoc(doc(db, 'users', user.uid), {
        username,
        profile: profileData,
        publicSlug,
        isNewUser: false
    }, { merge: true });
    await UserService.syncAccountDirectoryEntry(user.uid, accountIdForSlug, {
        username,
        accountId: accountIdForSlug,
        profile: profileData
    });

    originalProfileState = {
        username,
        pic: draftProfileState.pic,
        flag: draftProfileState.flag,
        originalPic: draftProfileState.originalPic,
        guilds: [...editingGuilds],
        cropState: draftProfileState.cropState
    };

    return {
        username,
        guilds: [...editingGuilds]
    };
}

export function setDraftProfileState(state) {
    draftProfileState = state;
}

export function setOriginalProfileState(state) {
    originalProfileState = state;
}

export function setEditingGuilds(guilds) {
    editingGuilds = normalizeGuildList(guilds);
}

export function setEditingGuildIndex(index) {
    editingGuildIndex = index;
}

export function addEditingGuild(guildName, addGuildBtn) {
    const value = String(guildName || '').trim();
    if (!value || editingGuilds.length >= MAX_PROFILE_GUILDS) return false;
    editingGuilds = normalizeGuildList([...editingGuilds, value]);
    renderGuildsList(addGuildBtn);
    updateProfileButtons();
    return true;
}

export function setCropperState(nextState) {
    const next = nextState && typeof nextState === 'object' ? nextState : {};
    cropperState = {
        x: Number(next.x) || 0,
        y: Number(next.y) || 0,
        scale: Number(next.scale) > 0 ? Number(next.scale) : 1
    };
}
