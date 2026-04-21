import { CreditCard, Banknote, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/transaction";

interface Method {
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}

const METHODS: Method[] = [
  { id: "CB",      label: "Carte Bancaire", icon: <CreditCard size={40} strokeWidth={1.2} /> },
  { id: "ESPECES", label: "Espèces",        icon: <Banknote   size={40} strokeWidth={1.2} /> },
  { id: "CHEQUE",  label: "Chèque",         icon: <FileText   size={40} strokeWidth={1.2} /> },
];

interface PaymentMethodsProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethods({ selected, onSelect }: PaymentMethodsProps) {
  return (
    <div className="col-span-4 flex flex-col gap-4">
      <span className="text-outline uppercase tracking-widest text-xs font-bold px-2">
        Méthode
      </span>

      {METHODS.map(({ id, label, icon }) => {
        const isActive = selected === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-4 rounded-xl transition-all active:scale-[0.98]",
              isActive
                ? "bg-surface-container-high border-l-4 border-primary text-primary hover:bg-surface-bright"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            {icon}
            <span className="font-black text-base tracking-widest">{label.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
