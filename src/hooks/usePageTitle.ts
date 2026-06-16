import { useContext } from "react";
import { pageTitleContext } from "@/contexts/page-title-context";

export const usePageTitle = () => useContext(pageTitleContext);
