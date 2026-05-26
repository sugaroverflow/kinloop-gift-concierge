import KinloopApp from "./kinloop-app";

export function createKinloopPage(initialView) {
  return function KinloopPage() {
    return <KinloopApp initialView={initialView} />;
  };
}
