import { auth } from "./client.js";
import { state } from "./appState.js";
import * as UserService from "./userService.js";
import { readJson, writeJson } from "./storage.js";

export async function persistUserAndLocal({
    remoteData = null,
    localWrite = null,
    skipInViewMode = true,
    label = "data"
} = {}) {
    if (skipInViewMode && state.isViewMode) return false;
    try {
        const user = auth.currentUser;
        if (
            user &&
            remoteData &&
            typeof remoteData === "object" &&
            !Array.isArray(remoteData) &&
            Object.keys(remoteData).length > 0
        ) {
            await UserService.updateUserData(user.uid, remoteData);
        }
        if (typeof localWrite === "function") {
            localWrite();
        }
        return true;
    } catch (e) {
        console.error(`Error saving ${label}:`, e);
        return false;
    }
}

export async function persistUserData(remoteData, options = {}) {
    return persistUserAndLocal({
        remoteData,
        localWrite: null,
        skipInViewMode: options.skipInViewMode !== false,
        label: options.label || "user data"
    });
}

export function createSyncedStore({
    storageKey,
    firestoreField,
    getValue,
    setValue,
    defaultValue = null,
    normalize = (value) => value,
    buildRemoteData = null,
    onLocalWrite = null,
    skipInViewMode = true,
    label = "data"
} = {}) {
    if (!storageKey) {
        throw new Error("createSyncedStore requires a storageKey");
    }
    if (typeof getValue !== "function") {
        throw new Error("createSyncedStore requires getValue()");
    }
    if (typeof setValue !== "function") {
        throw new Error("createSyncedStore requires setValue()");
    }

    const normalizeValue = (value) => {
        try {
            return normalize(value);
        } catch (e) {
            return normalize(defaultValue);
        }
    };

    const load = () => {
        const parsed = readJson(storageKey, defaultValue);
        const normalized = normalizeValue(parsed);
        setValue(normalized);
        return normalized;
    };

    const save = async (context = {}) => {
        const normalized = normalizeValue(getValue());
        setValue(normalized);
        const remoteData = typeof buildRemoteData === "function"
            ? buildRemoteData(normalized, context)
            : (firestoreField ? { [firestoreField]: normalized } : null);
        return persistUserAndLocal({
            remoteData,
            localWrite: () => {
                writeJson(storageKey, normalized);
                if (typeof onLocalWrite === "function") {
                    onLocalWrite(normalized, context);
                }
            },
            skipInViewMode,
            label
        });
    };

    return {
        load,
        save
    };
}
