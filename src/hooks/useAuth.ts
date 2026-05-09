import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

export type AuthUser = {
  id: number;
  name: string | null;
  email: string | null;
  ensamCode: string | null;
  role: string;
  yearId: number | null;
  sectorId: number | null;
  isApproved: boolean | null;
  avatar?: string | null;
};

export function useAuth() {
  const utils = trpc.useUtils();

  const {
    data: oauthUser,
    isLoading: oauthLoading,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const {
    data: localUser,
    isLoading: localLoading,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const user: AuthUser | null = useMemo(() => {
    if (oauthUser) {
      return {
        id: oauthUser.id,
        name: oauthUser.name,
        email: oauthUser.email,
        ensamCode: oauthUser.ensamCode,
        role: oauthUser.role,
        yearId: oauthUser.yearId,
        sectorId: oauthUser.sectorId,
        isApproved: oauthUser.isApproved,
        avatar: oauthUser.avatar,
      };
    }
    if (localUser) {
      return {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        ensamCode: localUser.ensamCode,
        role: localUser.role,
        yearId: localUser.yearId,
        sectorId: localUser.sectorId,
        isApproved: localUser.isApproved,
        avatar: localUser.avatar,
      };
    }
    return null;
  }, [oauthUser, localUser]);

  const isAdmin = user?.role === "admin";
  const isPromoRepresentative = user?.role === "promo_representative" && user?.isApproved;
  const isRepresentative = (user?.role === "representative" || user?.role === "promo_representative") && user?.isApproved;
  const isStudent = user?.role === "student";

  const logout = useCallback(() => {
    localStorage.removeItem("local_auth_token");
    logoutMutation.mutate();
    window.location.reload();
  }, [logoutMutation]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: oauthLoading || localLoading,
    isAdmin,
    isPromoRepresentative,
    isRepresentative,
    isStudent,
    logout,
  };
}
