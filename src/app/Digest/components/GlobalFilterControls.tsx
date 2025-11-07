import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { daoConfig } from '@/lib/constants';

export function GlobalFilterControls({
  selectedDao,
  setSelectedDao,
}: {
  selectedDao: string | null;
  setSelectedDao: (dao: string | null) => void;
}) {
  return (
    <div className="mb-6">
      <Select
        value={selectedDao || 'all-daos'}
        onValueChange={value => setSelectedDao(value === 'all-daos' ? null : value)}
      >
        <SelectTrigger className="cursor-pointer max-w-[180px]">
          <SelectValue placeholder="Filter by DAO" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem className="cursor-pointer" value="all-daos">
            All DAOs
          </SelectItem>
          {Object.keys(daoConfig).map(daoId => (
            <SelectItem className="cursor-pointer" key={daoId} value={daoId}>
              {daoConfig[daoId].name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
