const tempStorage = {};

export const storeToken = (itemID, accessToken) => {
    tempStorage[itemID] = accessToken;
};

export const getToken = (itemID) => {
    return tempStorage[itemID];
};
