import * as React from "react";
import { format, setMonth, setYear, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerWithSelectorsProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Generate years from 2000 to current year + 10
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2000 + 11 }, (_, i) => 2000 + i);

export function DatePickerWithSelectors({
  date,
  onDateChange,
  placeholder = "Selecione...",
  className,
}: DatePickerWithSelectorsProps) {
  const [calendarDate, setCalendarDate] = React.useState<Date>(date || new Date());

  React.useEffect(() => {
    if (date) {
      setCalendarDate(date);
    }
  }, [date]);

  const handleMonthChange = (monthStr: string) => {
    const newDate = setMonth(calendarDate, parseInt(monthStr));
    setCalendarDate(newDate);
  };

  const handleYearChange = (yearStr: string) => {
    const newDate = setYear(calendarDate, parseInt(yearStr));
    setCalendarDate(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b flex gap-2">
          <Select
            value={String(getMonth(calendarDate))}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={String(index)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={String(getYear(calendarDate))}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[90px] h-8 text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <DayPicker
          mode="single"
          selected={date}
          onSelect={onDateChange}
          month={calendarDate}
          onMonthChange={setCalendarDate}
          locale={ptBR}
          showOutsideDays={true}
          className={cn("p-3 pointer-events-auto")}
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          components={{
            IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
            IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
          }}
        />
        
        {date && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onDateChange(undefined)}>
              Limpar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
