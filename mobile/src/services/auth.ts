import * as SecureStore from "expo-secure-store";
const ACCESS = "access_token",
  REFRESH = "refresh_token",
  USER = "auth_user";
export const authStore = {
  async set(accessToken: string, refreshToken: string, user: unknown) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS, accessToken),
      SecureStore.setItemAsync(REFRESH, refreshToken),
      SecureStore.setItemAsync(USER, JSON.stringify(user)),
    ]);
  },
  async access() {
    return SecureStore.getItemAsync(ACCESS);
  },
  async refresh() {
    return SecureStore.getItemAsync(REFRESH);
  },
  async user() {
    const value = await SecureStore.getItemAsync(USER);
    return value ? JSON.parse(value) : null;
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS),
      SecureStore.deleteItemAsync(REFRESH),
      SecureStore.deleteItemAsync(USER),
    ]);
  },
};
