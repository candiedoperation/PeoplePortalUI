/**
  People Portal UI
  Copyright (C) 2026  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { toast } from "sonner"
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { AlertTriangleIcon, ExternalLinkIcon, PlusIcon, UsersRound } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { ORGANIZATION_NAME } from "@/commons/strings";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { useInfiniteQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";


export interface GetTeamsListResponse {
    teams: TeamInformationBrief[],
    nextCursor?: string
}

export interface TeamInformationBrief {
    pk: string,
    name: string,
    friendlyName: string,
    teamType: string,
    seasonType: string,
    seasonYear: number,
    description?: string
}

export const DashboardTeamsList = () => {
    const navigate = useNavigate()
    const [peopleList, setPeopleList] = React.useState<TeamInformationBrief[]>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [createNewTeamDialogOpen, setCreateNewTeamDialogOpen] = React.useState(false);
    const [allTeamsDialogOpen, setAllTeamsDialogOpen] = React.useState(false);

    const columns: ColumnDef<TeamInformationBrief>[] = [
        {
            accessorKey: 'friendlyName',
            header: "Team Name",
            cell: ({ row }) => (
                <div className="flex items-center">
                    <Avatar className="h-9 w-9 rounded-lg border">
                        <AvatarImage />
                        <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600">
                            <UsersRound size={18} />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col ml-3">
                        <span className="font-medium text-sm">{row.original.friendlyName}</span>
                        <span className="text-xs text-muted-foreground">{`${row.original.seasonType} ${row.original.seasonYear}`}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'description',
            header: "Description",
            cell: ({ row }) => {
                const str = row.original.description;
                if (!str) return <span className="text-muted-foreground">No description</span>;
                return <span className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]" title={str}>{str}</span>;
            }
        },
        {
            accessorKey: 'teamType',
            header: "Vertical",
            cell: ({ row }) => (
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {row.original.teamType}
                </span>
            )
        },
        {
            accessorKey: "name",
            header: "Shared Resources ID",
            cell: ({ row }) => (
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground">
                    {row.original.name}
                </code>
            )
        }
    ]

    const table = useReactTable({
        columns,
        data: peopleList,
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters
        }
    })

    const refreshList = () => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/myteams`)
            .then(async (response) => {
                const teamlistResponse: any = await response.json()
                if (!response.ok)
                    throw new Error(teamlistResponse.message || "Failed to fetch");

                setPeopleList(teamlistResponse.teams)
            })

            .catch((e) => {
                toast.error("Failed to Fetch Teams List: " + e.message)
            })
    }

    React.useEffect(() => {
        refreshList()
    }, []);

    return (
        <div className="flex flex-col w-full h-full min-h-0">
            { /* Attach Dialogs */}
            <CreateNewTeamDialog
                open={createNewTeamDialogOpen}
                openChanged={(open, refresh) => {
                    setCreateNewTeamDialogOpen(open)
                    if (refresh) refreshList()
                }}
            />

            <AllTeamsListDialog
                open={allTeamsDialogOpen}
                openChanged={setAllTeamsDialogOpen}
            />

            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Teams</h1>
            <h4 className="text-xl text-muted-foreground">View and Manage teams</h4>

            <div className="flex items-center py-4 mt-2">
                <Input
                    placeholder="Start Typing to Filter by Name"
                    value={(table.getColumn("friendlyName")?.getFilterValue() as string) ?? ""}
                    className="max-w-md"
                    onChange={(event) =>
                        table.getColumn("friendlyName")?.setFilterValue(event.target.value)
                    }
                />

                <div className="flex-grow-1"></div>
                <Button onClick={() => { setCreateNewTeamDialogOpen((open) => !open) }}><PlusIcon /> Create New Team</Button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    onClick={() => { navigate(`/org/teams/${row.original.pk}`) }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        return (<TableCell key={cell.id}>
                                            {
                                                flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext())
                                            }
                                        </TableCell>)
                                    })}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col items-center mt-5">
                <p className="text-sm text-muted-foreground">Viewing only teams you're a part of.</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:underline" onClick={() => setAllTeamsDialogOpen(true)}>
                    <span>See all teams here</span>
                    <ExternalLinkIcon size={14} />
                </div>
            </div>
        </div>
    )
}

interface CreateNewTeamDialogProps {
    open?: boolean,
    openChanged(open: boolean, refresh?: boolean): void
}

const CreateNewTeamDialog = (props: CreateNewTeamDialogProps) => {
    const submitURL = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/create`
    const [teamName, setTeamName] = React.useState("")
    const [teamDescription, setTeamDescription] = React.useState("")
    const [teamSeason, setTeamSeason] = React.useState<string>()
    const [teamType, setTeamType] = React.useState("");
    const [teamYear] = React.useState<number>(new Date().getFullYear())

    /* Role Management */
    const [projectLeadConfirmed, setProjectLeadConfirmed] = React.useState(false)
    const [teamRole, setTeamRole] = React.useState("")

    const [isLoading, setIsLoading] = React.useState(false)

    const handleFormSubmit = () => {
        setIsLoading(true)

        /* Resolve Requestor Role */
        let requestorRole = teamRole;
        if (teamType === "PROJECT") requestorRole = "Project Lead";
        if (teamType === "BOOTCAMP") requestorRole = "Bootcamp Director";

        fetch(submitURL, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friendlyName: teamName,
                teamType: teamType,
                seasonYear: teamYear,
                seasonType: teamSeason,
                description: teamDescription,
                requestorRole: requestorRole
            })
        }).then(async (res) => {
            if (!res.ok)
                throw new Error((await res.json()).message);

            /* Handle Response Status */
            if (res.status === 201) {
                toast.success(`New ${teamType.toLowerCase()} team for ${teamName} (${teamSeason} ${teamYear}) successfully created!`)
            } else if (res.status === 202) {
                toast.warning(`Team Creation Request Submitted. Please check your email for updates.`)
            }

            props.openChanged(false, true)
        }).catch((err) => {
            toast.error(`Team Creation Failed: ${err.message}`)
            props.openChanged(false)
        }).finally(() => {
            setIsLoading(false)
        })
    }

    /* Validation Logic */
    const isRoleValid = () => {
        if (teamType === "PROJECT" || teamType === "BOOTCAMP") return projectLeadConfirmed;
        if (teamType === "CORPORATE") return teamRole.trim().length > 0;
        return false;
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                        We're glad you're at this page to create a new team and to help the {ORGANIZATION_NAME} expand!
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <Alert>
                        <AlertTriangleIcon />
                        <AlertTitle>Please Choose Effective Team Names!</AlertTitle>
                        <AlertDescription><span>If you're leading a project, an effective team name would be like US News or Amazon Kuiper. If you're an internal team, an example team name would be Social Media. Please <b>ensure appropriate capitalization</b> and <b>do not append</b> terms like Fall 2024, etc.</span></AlertDescription>
                    </Alert>
                    <div className="grid gap-3">
                        <Label htmlFor="name-1">Team Name</Label>
                        <Input placeholder="Minimum 3 Characters" required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="name-1">Team Description</Label>
                        <Textarea maxLength={200} placeholder="Ex. Developing an MLOps pipeline for Brain Tumor Segmentation Models" required value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="username-1">Team Type</Label>
                        <Select required value={teamType} onValueChange={(val) => { setTeamType(val); setProjectLeadConfirmed(false); setTeamRole(""); }}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Team Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Team Type</SelectLabel>
                                    <SelectItem value="PROJECT">Project Team</SelectItem>
                                    <SelectItem value="BOOTCAMP">Bootcamp (Web Dev, Quantum, etc.)</SelectItem>
                                    <SelectItem value="CORPORATE">Corporate (All Other Teams, Ex. Sponsorhip)</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>

                        {/* Project / Bootcamp Confirmation */}
                        <div className={`flex items-center gap-3 ${(teamType == "PROJECT" || teamType == "BOOTCAMP") ? "" : "hidden"}`}>
                            <Checkbox checked={projectLeadConfirmed} onCheckedChange={(checked) => setProjectLeadConfirmed(checked != false)} id="projectlead_confirm" />
                            <Label htmlFor="projectlead_confirm">
                                {teamType == "PROJECT" ? "I confirm that I will be the Project Lead for this team" : "I confirm that I will be the Bootcamp Director for this team"}
                            </Label>
                        </div>

                        {/* Corporate Role Input */}
                        <div className={`grid gap-3 ${(teamType == "CORPORATE") ? "" : "hidden"}`}>
                            <Label htmlFor="role-1">Your Role</Label>
                            <Input placeholder="Ex. Team Lead, Director, etc." required value={teamRole} onChange={(e) => setTeamRole(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="username-1">Team Season</Label>
                        <div className="flex gap-3 w-full">
                            <Select required value={teamSeason} onValueChange={(val) => setTeamSeason(val)}>
                                <SelectTrigger className="flex-grow-1">
                                    <SelectValue placeholder="Select Term" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Term</SelectLabel>
                                        <SelectItem value="FALL">Fall</SelectItem>
                                        <SelectItem value="SPRING">Spring</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <Input
                                required
                                className="max-w-[150px]"
                                placeholder="Year"
                                value={teamYear}
                                disabled
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={handleFormSubmit}
                        disabled={isLoading || (teamName.trim().length < 3) || !teamSeason || !teamType || !isRoleValid()}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Team
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const queryClient = new QueryClient();

const AllTeamsListDialog = ({ open, openChanged }: { open: boolean, openChanged: (open: boolean) => void }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <AllTeamsListDialogContent open={open} openChanged={openChanged} />
        </QueryClientProvider>
    )
}

const AllTeamsListDialogContent = ({ open, openChanged }: { open: boolean, openChanged: (open: boolean) => void }) => {
    const [parentRef, setParentRef] = React.useState<HTMLDivElement | null>(null)
    const [search, setSearch] = React.useState("")
    const navigate = useNavigate()

    /* Debounce Search Mechanism */
    const [debouncedSearch, setDebouncedSearch] = React.useState(search);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    const {
        status,
        data,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery({
        queryKey: ['teams', debouncedSearch],
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams();
            params.append("limit", "20");
            if (pageParam) params.append("cursor", pageParam as string);
            if (debouncedSearch) params.append("search", debouncedSearch);

            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch teams");
            return res.json() as Promise<GetTeamsListResponse>;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: ""
    })

    const allRows = data ? data.pages.flatMap((d) => d.teams) : []

    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? allRows.length + 1 : allRows.length,
        getScrollElement: () => parentRef,
        estimateSize: () => 60, // Estimated row height
        overscan: 5,
    })

    React.useEffect(() => {
        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse()
        if (!lastItem) return

        if (
            lastItem.index >= allRows.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage()
        }
    }, [
        hasNextPage,
        fetchNextPage,
        allRows.length,
        isFetchingNextPage,
        rowVirtualizer.getVirtualItems(),
    ])

    return (
        <Dialog open={open} onOpenChange={openChanged}>
            <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>All Teams</DialogTitle>
                    <DialogDescription>
                        Browse all active teams in the organization here!
                    </DialogDescription>
                </DialogHeader>

                <Input
                    placeholder="Search for a team..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div
                    ref={setParentRef}
                    className="flex-grow w-full overflow-y-auto border rounded-md"
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const isLoaderRow = virtualRow.index > allRows.length - 1
                            const team = allRows[virtualRow.index]

                            return (
                                <div
                                    key={virtualRow.index}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className="flex items-center px-4 py-2 border-b hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                        if (!isLoaderRow) {
                                            openChanged(false)
                                            navigate(`/org/teams/${team.pk}`)
                                        }
                                    }}
                                >
                                    {isLoaderRow ? (
                                        <div className="flex w-full justify-center items-center h-full text-muted-foreground gap-2">
                                            {status === 'error' ? (
                                                <span>Error loading data</span>
                                            ) : (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} />
                                                    <span>Loading more...</span>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 rounded-lg">
                                                    <AvatarImage />
                                                    <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600">
                                                        <UsersRound size={18} />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{team.friendlyName}</span>
                                                    <span className="text-xs text-muted-foreground line-clamp-1">{team.description || "No description provided"}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-secondary px-2 py-1 rounded-full">{team.teamType}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <DialogFooter className="sm:justify-between items-center text-xs text-muted-foreground">
                    <span>{allRows.length} teams loaded</span>
                    <Button variant="outline" size="sm" onClick={() => openChanged(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}