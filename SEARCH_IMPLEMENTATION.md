# UniShelf Tag Management & Search Feature Plan

## Overview
Add tag assignment functionality for resources and enable tag-based search with suggestions.

---

## 1. Backend Changes

### 1.1 New Endpoint: `/tags/suggestions`
**File:** `backend/app/controllers/tags/router.py`

Add endpoint to return tag suggestions based on partial input:
- **Route:** `GET /tags/suggestions?q={query}`
- **Query param:** `q` (required, min_length=1)
- **Returns:** List of matching tags ordered by name
- **Auth:** Requires valid JWT token

**Purpose:** Enable autocomplete/suggestions when users type tag names

### 1.2 Update Resource Schema Response
**File:** `backend/app/controllers/resources/schemas.py`

Add a new schema for resources with full tag details (not just brief):
- **Schema name:** `ResourceWithTags`
- Include: All current fields + full `tags` array with id, name, description, category

**Purpose:** Provide richer tag data to frontend when fetching resources

---

## 2. Frontend Changes

### 2.1 Update Types
**File:** `frontend/types/index.ts`

**Changes:**
- Update `TagBrief` interface to match backend (id, name only)
- Update `Tag` interface to match backend (id, name, description, category)
- Ensure `Resource.tags` uses full `Tag[]` type (not just brief)

### 2.2 Add Tags Redux Slice
**File:** `frontend/lib/features/tags/tagSlice.ts` (NEW)

```typescript
// State structure:
{
  items: Tag[];
  suggestions: Tag[];
  loading: boolean;
  error: string | null;
}
```

**Actions needed:**
- `fetchTags({ category?, skip?, limit? })` — Get all tags
- `fetchTagSuggestions(query)` — Get tag suggestions for search
- `clearError()` — Clear error state

### 2.3 Update Resources Redux Slice
**File:** `frontend/lib/features/resources/resourceSlice.ts`

**Add new thunks:**
```typescript
export const assignTagsToResource = createAsyncThunk<
  TagBrief[],
  { id: number; tagIds: number[] },
  { rejectValue: string }
>('resources/assignTags', ...)

export const removeTagFromResource = createAsyncThunk<
  void,
  { resourceId: number; tagId: number },
  { rejectValue: string }
>('resources/removeTag', ...)
```

**Add to extraReducers:** Handle pending/fulfilled/rejected for both new actions

### 2.4 Create Tag Input Component
**File:** `frontend/components/ui/tag-input.tsx` (NEW)

**Features:**
- Text input for typing tag names
- Dropdown showing matching existing tags as suggestions
- Clickable chips to add selected tags to list
- Allow creating new tags that don't exist yet
- Max 20 tags per resource (enforce in UI + backend validation)
- Debounced API calls for suggestions

**Props:**
```typescript
interface TagInputProps {
  initialTags?: Tag[];
  onTagAdd(tag: Tag): void;
  onTagRemove(tagId: number): void;
  disabled?: boolean;
}
```

### 2.5 Create Tag Manager Modal
**File:** `frontend/components/dashboard/tag-manager-modal.tsx` (NEW)

**Features:**
- Modal dialog for managing tags on a resource
- Show existing tags as chips with remove X button
- Tag input component above
- "Add Tags" section below
- Save/Cancel buttons
- Loading states

**Props:**
```typescript
interface TagManagerModalProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  resourceId: number;
  currentTags: Tag[];
  onTagsUpdated(newTags: Tag[]): void;
}
```

### 2.6 Create Filter Bar Component
**File:** `frontend/components/dashboard/resource-filter-bar.tsx` (NEW)

**Features:**
- Text search input (searches title/description)
- Multi-select tag filter with chips
- "Clear filters" button
- AND logic: resources must match ALL selected tags + search query
- Shows active filter count badge

**State management:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
```

### 2.7 Update Resource Table Card
**File:** `frontend/components/dashboard/resource-table-card.tsx`

**Changes:**
- Add "Manage Tags" button column (only for owners/admins)
- Show tag badges in the table (truncate if too many, show tooltip)
- Add "View All Tags" click handler to open TagManagerModal

### 2.8 Update Dashboard Page
**File:** `frontend/app/dashboard/page.tsx`

**Changes:**
- Import and render new components:
  - `<ResourceFilterBar />` above upload card
  - Pass handlers for search/tag filtering
- Update table props to include tag management callbacks
- Implement filtering logic in `fetchResources` call

### 2.9 Add Filtered Resource Fetch Hook
**File:** `frontend/hooks/useFilteredResources.ts` (NEW)

**Purpose:** Centralize the logic for fetching resources with search + tag filters

```typescript
export const useFilteredResources = (
  searchQuery: string,
  selectedTagIds: number[]
) => {
  // Calls fetchResources with query parameters
}
```

---

## 3. Implementation Order

### Phase 1: Backend Foundation (Day 1)
1. Add `/tags/suggestions` endpoint
2. Update `ResourceWithTags` schema
3. Test endpoints via curl/Postman

### Phase 2: Frontend State & Types (Day 2)
4. Update type definitions
5. Create tags slice with all actions
6. Add resource tag management thunks

### Phase 3: UI Components (Day 3)
7. Build TagInput component with suggestions
8. Build TagManagerModal component
9. Build ResourceFilterBar component

### Phase 4: Integration (Day 4)
10. Update ResourceTableCard with tag badges and manage button
11. Update Dashboard page with filter bar
12. Implement filtering logic in resource fetching
13. Test complete flow end-to-end

---

## 4. API Endpoints Summary

### Existing (No Changes Needed)
- `GET /tags?category=&skip=&limit=` — List all tags
- `POST /resources/{id}/tags` — Assign tags to resource
- `DELETE /resources/{id}/tags/{tag_id}` — Remove tag from resource
- `GET /resources?tags=tag1,tag2&q=search` — Search with filters

### New Endpoints Required
```http
# Tag suggestions (new)
GET /tags/suggestions?q={query}
Response: Tag[]

# Resource with full tags (schema change)
GET /resources/{id}
Returns: ResourceWithTags  # includes full tag details
```

---

## 5. Key Design Decisions

### 1. AND Logic for Multi-Tag Filter
**Why:** More precise results - user wants resources that match ALL selected topics

Example: Selecting "math" + "calculus" shows only calculus resources, not all math resources

### 2. Allow New Tags (Not Just Pre-defined)
**Why:** Users need flexibility to create relevant tags on-the-fly
**Implementation:** TagInput accepts any input, creates new tag if doesn't exist

### 3. Modal-Based Tag Management
**Why:** Cleaner UI, avoids cluttering main table view
**Benefit:** Full tag details visible in modal, easy bulk management

### 4. Separate Tags Redux Slice
**Why:** Clean separation of concerns
**Benefit:** Can fetch suggestions independently from full tag list

---

## 6. Error Handling

### Backend
- Tag assignment: Return 404 if resource/tag not found
- Suggestions: Return empty array on no matches (not error)
- Validation: Enforce max 20 tags per resource

### Frontend
- Show toast notifications for all async operations
- Display loading states during fetch/suggestion calls
- Graceful fallback when tag suggestions fail (still allow typing)

---

## 7. Testing Checklist

- [ ] Upload resource with no tags
- [ ] Assign single tag to resource
- [ ] Assign multiple tags to resource
- [ ] Remove individual tag from resource
- [ ] Search by text query only
- [ ] Filter by single tag
- [ ] Filter by multiple tags (AND logic)
- [ ] Combine text search + tag filters
- [ ] Type in tag input and see suggestions
- [ ] Create new tag that doesn't exist yet
- [ ] View resource table with tag badges
- [ ] Open tag manager modal and manage tags

---

## 8. Future Enhancements (Out of Scope)

- Tag cloud visualization showing most popular tags
- Auto-suggest from user's interest tags
- Tag hierarchy/nested categories
- Bulk tag assignment across multiple resources
- Export/import tags CSV
