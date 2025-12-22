import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { TraitDescription } from "../../data/traitDescriptions";

/**
 * InfoPanel context - provides a shared state for displaying detailed
 * Player's Handbook-style information about traits, feats, spells, skills,
 * backgrounds, species, classes, and other D&D concepts.
 */

interface InfoPanelContextValue {
  selectedInfo: TraitDescription | null;
  isOpen: boolean;
  showInfo: (info: TraitDescription) => void;
  closeInfo: () => void;
}

const InfoPanelContext = createContext<InfoPanelContextValue | null>(null);

export function InfoPanelProvider({ children }: { children: ReactNode }) {
  const [selectedInfo, setSelectedInfo] = useState<TraitDescription | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);

  const showInfo = useCallback((info: TraitDescription) => {
    setSelectedInfo(info);
    setIsOpen(true);
  }, []);

  const closeInfo = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <InfoPanelContext.Provider
      value={{ selectedInfo, isOpen, showInfo, closeInfo }}
    >
      {children}
    </InfoPanelContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInfoPanel() {
  const context = useContext(InfoPanelContext);
  if (!context) {
    throw new Error("useInfoPanel must be used within an InfoPanelProvider");
  }
  return context;
}
