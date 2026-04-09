import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth";
import { Loading } from "@/src/ui";

export default function Index() {
  const { loading, token } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={token ? "/(tabs)/dashboard" : "/login"} />;
}
