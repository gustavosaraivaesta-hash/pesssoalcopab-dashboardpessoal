import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectFilterProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

const MultiSelectFilter = React.memo(({ label, options, selectedValues, onToggle }: MultiSelectFilterProps) => (
  <div>
    <label className="text-sm font-medium text-muted-foreground mb-2 block">{label}</label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">
            {selectedValues.length === 0
              ? "Todos"
              : selectedValues.length === 1
                ? options.find(o => o.value === selectedValues[0])?.label || selectedValues[0]
                : `${selectedValues.length} selecionados`}
          </span>
          <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 bg-popover" align="start">
        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-1">
            {options.map(option => (
              <div
                key={option.value}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                onClick={() => onToggle(option.value)}
              >
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={() => onToggle(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  </div>
));

MultiSelectFilter.displayName = "MultiSelectFilter";

export default MultiSelectFilter;
