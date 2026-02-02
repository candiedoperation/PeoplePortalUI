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
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { toast } from "sonner"
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from "../ui/pagination";
import { MailIcon } from "lucide-react";

export interface PaginationDefinition {
    next: number;
    previous: number;
    count: number;
    current: number;
    total_pages: number;
    start_index: number;
    end_index: number;
}

export interface GetUserListResponse {
    pagination: PaginationDefinition,
    users: UserInformationBrief[],
    message?: string /* Only when Request Fails */
}

export interface UserInformationBrief {
    pk: string,
    username: string,
    email: string,
    name: string,
    memberSince: Date,
    active: boolean,
    attributes: any,
    avatar?: string
}

export const DashboardPeopleList = () => {
    const navigate = useNavigate()
    const [peopleList, setPeopleList] = React.useState<UserInformationBrief[]>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    /* Pagination State */
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [isLoading, setIsLoading] = React.useState(false);

    /* Search State */
    const [search, setSearch] = React.useState("");
    const [debouncedSearch, setDebouncedSearch] = React.useState("");

    /* Debounce Side Effect */
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const columns: ColumnDef<UserInformationBrief>[] = [
        {
            accessorKey: 'name',
            header: "Name",
            cell: ({ row }) => {
                const initials = row.original.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U";

                const nameParts = row.original.name?.split(" ") || [];
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";

                return (
                    <div className="flex items-center">
                        <Avatar className="h-9 w-9 rounded-lg">
                            <AvatarImage src={row.original.avatar} alt={row.original.name} className="object-cover" />
                            <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col ml-3">
                            <span className="font-medium text-sm">{firstName}</span>
                            {lastName && <span className="text-xs text-muted-foreground uppercase">{lastName}</span>}
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: 'username',
            header: "Alias",
            cell: ({ row }) => {
                return (
                    <span className="font-medium text-sm text-foreground">
                        {row.original.username}
                    </span>
                )
            }
        },
        {
            accessorKey: 'email',
            header: "Contact",
            cell: ({ row }) => (
                <div className="flex items-center font-mono text-xs text-muted-foreground">
                    <MailIcon className="mr-2 h-3.5 w-3.5" />
                    {row.original.email}
                </div>
            )
        },
        {
            accessorKey: 'memberSince',
            header: "Member Since",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(row.original.memberSince), "PPP")}
                </span>
            )
        },
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
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append("page", currentPage.toString());
        if (debouncedSearch) params.append("search", debouncedSearch);

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people?${params.toString()}`)
            .then(async (response) => {
                const userlistResponse: GetUserListResponse = await response.json()
                if (!response.ok)
                    throw new Error(userlistResponse.message || "Failed to fetch");

                setPeopleList(userlistResponse.users)
                setTotalPages(userlistResponse.pagination.total_pages)
            })
            .catch((e) => {
                toast.error("Failed to Fetch People List: " + e.message)
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    React.useEffect(() => {
        refreshList()
    }, [currentPage, debouncedSearch]);

    /* Pagination Logic Helpers */
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex flex-col w-full h-full">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">People</h1>
            <h4 className="text-xl text-muted-foreground">Here&apos;s Everyone in App Dev!</h4>

            <div className="flex items-center justify-between py-4 mt-2 gap-4">
                <Input
                    placeholder="Search by Name..."
                    value={search}
                    className="max-w-md"
                    onChange={(event) => setSearch(event.target.value)}
                />

                <Pagination className="justify-end w-auto mx-0">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1) }}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {getPageNumbers().map(page => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href="#"
                                    isActive={page === currentPage}
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(page) }}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(p => p + 1) }}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>

            <div className={`overflow-hidden rounded-md border ${isLoading ? "opacity-50" : ""}`}>
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
                                    onClick={() => { navigate(`/org/people/${row.original.pk}`) }}
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
                                    {isLoading ? "Loading..." : "No results"}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-end mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <span>Page {currentPage} of {totalPages}</span>
            </div>
        </div>
    )
}