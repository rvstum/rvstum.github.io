import { state } from "./appState.js";
import { t, tf } from "./i18n.js";
import { ACHIEVEMENTS_LIST } from "./achievements.js?v=20260304-achievements-6k";
import { compressImageFileToDataUrl } from "./imageUtils.js";
import { writeJson, ACHIEVEMENTS_STORAGE_KEY } from "./storage.js";
import { escapeHtml } from "./utils.js";
import { persistUserAndLocal } from "./persistence.js";

const ACHIEVEMENT_PREFIXES = [
    { prefix: 'total_', key: 'total', categoryLabelKey: 'achievement_cat_lifetime' },
    { prefix: 'kill_', key: 'kills', categoryLabelKey: 'achievement_cat_kills' },
    { prefix: 'points_', key: 'points', categoryLabelKey: 'achievement_cat_points' },
    { prefix: 'streak_', key: 'streak', categoryLabelKey: 'achievement_cat_streak' },
    { prefix: 'duo_', key: 'duo', categoryLabelKey: 'achievement_cat_duo', groupLabelKey: 'achievement_group_duo' },
    { prefix: 'trio_', key: 'trio', categoryLabelKey: 'achievement_cat_trio', groupLabelKey: 'achievement_group_trio' },
    { prefix: 'quad_', key: 'quad', categoryLabelKey: 'achievement_cat_quad', groupLabelKey: 'achievement_group_quad' }
];

function getAchievementMigrationTarget(id, records) {
    const safeRecords = (records && typeof records === 'object' && !Array.isArray(records)) ? records : {};
    const has2kTier = Object.prototype.hasOwnProperty.call(safeRecords, 'points_2k_day');

    if (id === 'points_8k_day') {
        return 'points_6k_day';
    }

    if (!has2kTier) {
        if (id === 'points_4k_day') {
            return 'points_2k_day';
        }
        if (id === 'points_6k_day') {
            return 'points_4k_day';
        }
    }

    return id;
}

function mergeAchievementRecord(existing, incoming) {
    const safeExisting = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? existing : {};
    const safeIncoming = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    const merged = { ...safeIncoming, ...safeExisting };

    if (safeExisting.completed || safeIncoming.completed) {
        merged.completed = true;
    }

    return merged;
}

export function normalizeAchievementsState(records) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) return {};

    let changed = false;
    const normalized = {};

    Object.entries(records).forEach(([id, value]) => {
        const nextId = getAchievementMigrationTarget(id, records);
        if (nextId !== id) changed = true;
        normalized[nextId] = mergeAchievementRecord(normalized[nextId], value);
    });

    return changed ? normalized : records;
}

function syncNormalizedAchievementsState() {
    const normalized = normalizeAchievementsState(state.userAchievements);
    if (normalized === state.userAchievements) return;
    state.userAchievements = normalized;
    if (!state.isViewMode) {
        writeJson(ACHIEVEMENTS_STORAGE_KEY, state.userAchievements);
    }
}

function getAchievementPrefixConfig(id) {
    if (!id) return null;
    return ACHIEVEMENT_PREFIXES.find((entry) => id.startsWith(entry.prefix)) || null;
}

export function getAchievementCategory(id) {
    const prefixConfig = getAchievementPrefixConfig(id);
    if (prefixConfig) {
        return { key: prefixConfig.key, label: t(prefixConfig.categoryLabelKey) };
    }
    return { key: 'general', label: t('achievement_cat_challenge') };
}

export function parseAchievementValueToken(token) {
    if (!token) return '';
    const normalized = String(token).toLowerCase();
    if (normalized.endsWith('m')) {
        const n = Number(normalized.slice(0, -1));
        return Number.isFinite(n) ? Math.round(n * 1000000).toLocaleString() : token;
    }
    if (normalized.endsWith('k')) {
        const n = Number(normalized.slice(0, -1));
        return Number.isFinite(n) ? Math.round(n * 1000).toLocaleString() : token;
    }
    const n = Number(normalized);
    return Number.isFinite(n) ? n.toLocaleString() : token;
}

export function getLocalizedAchievementGoal(achievement) {
    const id = achievement && achievement.id ? String(achievement.id) : '';
    if (!id) return achievement && achievement.title ? achievement.title : '';
    const prefixConfig = getAchievementPrefixConfig(id);
    if (!prefixConfig) return achievement.title || '';

    if (prefixConfig.key === 'total') {
        return tf('achievement_goal_total', { value: parseAchievementValueToken(id.slice(prefixConfig.prefix.length)) });
    }
    if (prefixConfig.key === 'kills') {
        if (!id.endsWith('_day')) return achievement.title || '';
        return tf('achievement_goal_kills_day', { value: parseAchievementValueToken(id.slice(prefixConfig.prefix.length, -'_day'.length)) });
    }
    if (prefixConfig.key === 'points') {
        if (!id.endsWith('_day')) return achievement.title || '';
        return tf('achievement_goal_points_day', { value: parseAchievementValueToken(id.slice(prefixConfig.prefix.length, -'_day'.length)) });
    }
    if (prefixConfig.key === 'streak') {
        return tf('achievement_goal_streak', { value: parseAchievementValueToken(id.slice(prefixConfig.prefix.length)) });
    }
    if (prefixConfig.groupLabelKey) {
        return tf('achievement_goal_group_day', {
            group: t(prefixConfig.groupLabelKey),
            value: parseAchievementValueToken(id.slice(prefixConfig.prefix.length))
        });
    }
    return achievement.title || '';
}

export function getAchievementFriendSlots(achievement) {
    const slots = Number(achievement.friendSlots);
    if (Number.isFinite(slots) && slots > 0) return Math.max(1, Math.floor(slots));
    if (achievement.hasInput) return 1;
    return 0;
}

export function getAchievementFriendNames(data, slots) {
    const names = new Array(slots).fill('');
    if (Array.isArray(data.friends)) {
        for (let i = 0; i < slots; i++) {
            const value = data.friends[i];
            if (typeof value === 'string') names[i] = value;
        }
    }
    if (!names[0] && typeof data.note === 'string') {
        names[0] = data.note;
    }
    return names;
}

export function renderAchievements(openImageViewer, showConfirmModal) {
    syncNormalizedAchievementsState();
    const container = document.getElementById('achievementList');
    if (!container) return;
    container.innerHTML = '';

    ACHIEVEMENTS_LIST.forEach((ach, index) => {
        const data = state.userAchievements[ach.id] || {};
        const isCompleted = !!data.completed;
        const friendSlots = getAchievementFriendSlots(ach);
        const friendNames = getAchievementFriendNames(data, friendSlots);
        const proofImage = typeof data.image === 'string' ? data.image : '';
        const category = getAchievementCategory(ach.id);
        const goalText = getLocalizedAchievementGoal(ach);
        const indexLabel = String(index + 1).padStart(2, '0');

        const item = document.createElement('div');
        item.className = 'achievement-item';
        if (isCompleted) item.classList.add('completed');

        let inputHtml = '';
        if (friendSlots > 0) {
            const placeholder = state.isViewMode ? '' : t('achievement_enter_friend_name');
            const inputFields = friendNames.map((name, friendIndex) => {
                const normalizedName = typeof name === 'string' ? name : '';
                const displayValue = (state.isViewMode && !normalizedName.trim())
                    ? t('achievement_session_incomplete')
                    : normalizedName;
                const label = tf('achievement_friend_label', { index: friendIndex + 1 });
                return `
                    <div class="achievement-note-wrap">
                        <div class="achievement-note-label">${escapeHtml(label)}</div>
                        <input type="text" class="achievement-input" data-friend-index="${friendIndex}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(displayValue)}" ${state.isViewMode ? 'disabled' : ''}>
                    </div>
                `;
            }).join('');
            const noteLayoutClass = friendSlots > 1 ? 'achievement-note-fields-multi' : '';
            const friendCountClass = friendSlots === 3 ? 'achievement-note-fields-triple' : '';
            inputHtml = `
                <div class="achievement-note-fields ${noteLayoutClass} ${friendCountClass}">
                    ${inputFields}
                </div>
            `;
        }

        let proofHtml = '';
        if (friendSlots > 0) {
            const proofPlaceholder = state.isViewMode ? t('achievement_no_image') : t('achievement_upload_image');
            const removeImageBtn = (!state.isViewMode && proofImage)
                ? `<button type="button" class="achievement-proof-remove" aria-label="${escapeHtml(t('remove_image'))}">&times;</button>`
                : '';
            proofHtml = `
                <div class="achievement-proof-wrap">
                    <div class="achievement-note-label">${t('achievement_session_image')}</div>
                    <div class="achievement-proof-upload ${proofImage ? 'has-image' : ''}" ${state.isViewMode ? '' : 'tabindex="0"'}>
                        ${proofImage
                            ? `<img src="${escapeHtml(proofImage)}" class="achievement-proof-preview" alt="Achievement proof image">`
                            : `<span class="achievement-proof-placeholder">${proofPlaceholder}</span>`
                        }
                        ${removeImageBtn}
                    </div>
                    <input type="file" class="achievement-proof-input" accept="image/*" ${state.isViewMode ? 'disabled' : ''}>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-index">${indexLabel}</div>
                <div class="achievement-info">
                    <div class="achievement-meta-row">
                        <span class="achievement-category achievement-category-${category.key}">${category.label}</span>
                        <span class="achievement-state ${isCompleted ? 'done' : 'incomplete'}">${isCompleted ? t('achievement_completed') : t('achievement_incomplete')}</span>
                    </div>
                    <div class="achievement-goal">${goalText}</div>
                </div>
                <input
                    type="checkbox"
                    class="achievement-checkbox${state.isViewMode ? ' achievement-checkbox--view' : ''}"
                    ${isCompleted ? 'checked' : ''}
                    ${state.isViewMode ? 'tabindex="-1" aria-disabled="true"' : ''}
                >
            </div>
            ${inputHtml}
            ${proofHtml}
        `;

        const checkbox = item.querySelector('.achievement-checkbox');
        const stateBadge = item.querySelector('.achievement-state');
        checkbox.addEventListener('change', (e) => {
            const isNowCompleted = !!e.target.checked;
            if (!state.userAchievements[ach.id]) state.userAchievements[ach.id] = {};
            state.userAchievements[ach.id].completed = isNowCompleted;

            if (isNowCompleted) item.classList.add('completed');
            else item.classList.remove('completed');

            if (stateBadge) {
                stateBadge.textContent = isNowCompleted ? t('achievement_completed') : t('achievement_incomplete');
                stateBadge.classList.remove('done', 'incomplete');
                stateBadge.classList.add(isNowCompleted ? 'done' : 'incomplete');
            }

            saveAchievements();
            updateAchievementsProgress();
        });

        item.addEventListener('click', (e) => {
            if (state.isViewMode) return;
            if (e.target.classList.contains('achievement-checkbox')) return;
            if (e.target.closest('.achievement-note-wrap')) return;
            if (e.target.closest('.achievement-proof-wrap')) return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });

        if (friendSlots > 0) {
            const inputs = item.querySelectorAll('.achievement-input');
            const saveFriendNames = () => {
                if (!state.userAchievements[ach.id]) state.userAchievements[ach.id] = {};
                const names = Array.from(inputs).map(input => input.value || '');
                state.userAchievements[ach.id].friends = names;
                state.userAchievements[ach.id].note = names[0] || '';
                saveAchievements();
            };
            inputs.forEach(input => {
                input.addEventListener('input', saveFriendNames);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                    }
                });
            });

            const proofUpload = item.querySelector('.achievement-proof-upload');
            const proofInput = item.querySelector('.achievement-proof-input');
            const getCurrentProofImage = () => {
                const stored = state.userAchievements[ach.id] && typeof state.userAchievements[ach.id].image === 'string'
                    ? state.userAchievements[ach.id].image
                    : '';
                if (stored) return stored;
                const preview = proofUpload ? proofUpload.querySelector('.achievement-proof-preview') : null;
                return preview && typeof preview.getAttribute === 'function'
                    ? (preview.getAttribute('src') || '')
                    : '';
            };
            if (proofUpload && proofInput && !proofInput.disabled) {
                const emptyProofText = t('achievement_upload_image');
                const renderProofState = (imageData) => {
                    if (imageData) {
                        const safeUrl = escapeHtml(imageData);
                        proofUpload.classList.add('has-image');
                        proofUpload.innerHTML = `
                            <img src="${safeUrl}" class="achievement-proof-preview" alt="Achievement proof image">
                            <button type="button" class="achievement-proof-remove" aria-label="Remove image">&times;</button>
                        `;
                        const removeBtn = proofUpload.querySelector('.achievement-proof-remove');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showConfirmModal(
                                    t('achievement_remove_image_title'),
                                    t('achievement_remove_image_confirm'),
                                    () => {
                                        if (!state.userAchievements[ach.id]) state.userAchievements[ach.id] = {};
                                        delete state.userAchievements[ach.id].image;
                                        saveAchievements();
                                        renderProofState('');
                                    }
                                );
                            });
                        }
                    } else {
                        proofUpload.classList.remove('has-image');
                        proofUpload.innerHTML = `<span class="achievement-proof-placeholder">${emptyProofText}</span>`;
                    }
                };

                const openProofPicker = () => proofInput.click();

                const handleClickOrKey = (e) => {
                    if (e.target.closest('.achievement-proof-remove')) return;
                    const currentImage = getCurrentProofImage();
                    if (currentImage) {
                        openImageViewer(currentImage, '');
                    } else {
                        openProofPicker();
                    }
                };

                proofUpload.addEventListener('click', handleClickOrKey);
                proofUpload.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClickOrKey(e);
                    }
                });

                proofInput.addEventListener('change', async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    try {
                        const dataUrl = await compressImageFileToDataUrl(file);
                        if (!state.userAchievements[ach.id]) state.userAchievements[ach.id] = {};
                        state.userAchievements[ach.id].image = dataUrl;
                        saveAchievements();
                        renderProofState(dataUrl);
                    } catch (err) {
                        console.error('Failed to process achievement image:', err);
                    } finally {
                        proofInput.value = '';
                    }
                });

                renderProofState(proofImage);
            } else if (proofUpload && state.isViewMode) {
                proofUpload.addEventListener('click', () => {
                    const currentImage = getCurrentProofImage();
                    if (currentImage) openImageViewer(currentImage, '');
                });
                const proofPreview = proofUpload.querySelector('.achievement-proof-preview');
                if (proofPreview) {
                    proofPreview.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const currentImage = getCurrentProofImage();
                        if (currentImage) openImageViewer(currentImage, '');
                    });
                }
                proofUpload.addEventListener('keydown', (e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    const currentImage = getCurrentProofImage();
                    if (currentImage) openImageViewer(currentImage, '');
                });
            }
        }

        container.appendChild(item);
    });
    updateAchievementsProgress();
}

export async function saveAchievements() {
    await persistUserAndLocal({
        remoteData: {
            achievements: state.userAchievements
        },
        localWrite: () => {
            writeJson(ACHIEVEMENTS_STORAGE_KEY, state.userAchievements);
        },
        label: "achievements"
    });
}

export function updateAchievementsProgress() {
    syncNormalizedAchievementsState();
    const total = ACHIEVEMENTS_LIST.length;
    const completed = Object.values(state.userAchievements).filter(a => a.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    let viewerName = '';
    if (state.isViewMode) {
        const context = state.activeViewProfileContext && typeof state.activeViewProfileContext === 'object'
            ? state.activeViewProfileContext
            : null;
        const contextName = context && typeof context.username === 'string' ? context.username.trim() : '';
        viewerName = contextName || t('unknown_player');
    }

    let progressLead = `${t('achievement_you_have')}:`;
    if (state.isViewMode) {
        const localizedViewPrefix = tf('achievement_progress_view_prefix', { name: viewerName });
        const safePrefix = typeof localizedViewPrefix === 'string' ? localizedViewPrefix.trim() : '';
        if (!safePrefix) {
            progressLead = viewerName;
        } else if (safePrefix.includes(viewerName)) {
            progressLead = safePrefix;
        } else {
            progressLead = `${viewerName} ${safePrefix}`;
        }
    }
    const percentLabel = `(${percent}%)`;

    const fills = document.querySelectorAll('.achievements-fill');
    const texts = document.querySelectorAll('.achievements-text');
    
    fills.forEach(fill => {
        if (fill) fill.style.width = `${percent}%`;
    });
    texts.forEach(text => {
        if (text) {
            text.innerHTML = '';
            const textNode = document.createTextNode(`${progressLead} ${completed}/${total} `);
            const span = document.createElement('span');
            span.className = 'achievements-percent';
            span.textContent = percentLabel;
            text.appendChild(textNode);
            text.appendChild(span);
        }
    });
}
