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
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext } from "../ui/pagination";
import { MailIcon, Trash2Icon, User2Icon } from "lucide-react";

export interface UserInformationBrief {
    pk: string,
    username: string,
    email: string,
    name: string,
    memberSince?: Date,
    active: boolean,
    attributes: any,
    avatar?: string
}

export interface UserTableProps {
    users: UserInformationBrief[];
    showPagination?: boolean;
    onUserClick?: (userId: string) => void;
    onRemove?: (user: UserInformationBrief) => void;
    filterPlaceholder?: string;
    className?: string;
    teamPk?: string;
}

export const UserInformationTable: React.FC<UserTableProps> = ({
    users,
    showPagination = false,
    onUserClick,
    onRemove,
    filterPlaceholder = "Start Typing to Filter by Name",
    className = "",
    teamPk
}) => {
    const navigate = useNavigate()
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const columns: ColumnDef<UserInformationBrief>[] = [
        { accessorKey: 'name', header: "Name", size: 250 },
        {
            id: "role",
            header: "Role",
            size: 150,
            cell: ({ row }) => {
                if (!teamPk || !row.original.attributes?.roles) return <span className="text-muted-foreground text-xs">Not Specified</span>;
                const role = row.original.attributes.roles[teamPk];

                if (!role) return <span className="text-muted-foreground text-xs">Not Specified</span>;

                return (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {role}
                    </span>
                )
            }
        },
        {
            accessorKey: "username",
            header: "Alias",
            size: 120,
            cell: ({ row }) => (
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground">
                    {row.original.username}
                </code>
            )
        },
        {
            accessorKey: 'email',
            header: "Contact Information",
            size: 250,
            cell: ({ row }) => (
                <div className="flex items-center font-mono text-xs text-muted-foreground truncate" title={row.original.email}>
                    <MailIcon className="mr-2 h-3.5 w-3.5" />
                    {row.original.email}
                </div>
            )
        },
        ...(onRemove ? [{
            id: 'actions',
            header: 'Actions',
            size: 70,
            cell: ({ row }: { row: { original: UserInformationBrief } }) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(row.original);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full text-muted-foreground hover:text-red-600 transition-colors"
                    title="Remove member"
                >
                    <Trash2Icon size={16} />
                </button>
            )
        }] : [])
    ]

    const table = useReactTable({
        columns,
        data: users,
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters
        }
    })

    const handleRowClick = (userId: string) => {
        if (onUserClick) {
            onUserClick(userId);
        } else {
            navigate(`/org/people/${userId}`);
        }
    }

    return (
        <div className={`flex flex-col w-full h-full ${className}`}>
            <div className="flex items-center py-4">
                <Input
                    placeholder={filterPlaceholder}
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    className="max-w-md flex-grow-1"
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                />

                {showPagination && (
                    <Pagination className="justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious href="#" />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    2
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">3</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext href="#" />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            <div className="overflow-hidden rounded-md border">
                <Table className="table-fixed">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const widthClass =
                                        header.id === 'name' ? 'w-[250px]' :
                                            header.id === 'role' ? 'w-[150px]' :
                                                header.id === 'username' ? 'w-[120px]' :
                                                    header.id === 'email' ? 'w-[250px]' :
                                                        header.id === 'actions' ? 'w-[70px]' : '';
                                    return (
                                        <TableHead key={header.id} className={widthClass}>
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
                                    onClick={() => handleRowClick(row.original.pk)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        const widthClass =

                                            cell.column.id === 'name' ? 'w-[250px]' :
                                                cell.column.id === 'role' ? 'w-[150px]' :
                                                    cell.column.id === 'username' ? 'w-[120px]' :
                                                        cell.column.id === 'email' ? 'w-[250px]' :
                                                            cell.column.id === 'actions' ? 'w-[70px]' : '';
                                        return (<TableCell key={cell.id} className={widthClass}>
                                            {
                                                flexRender(
                                                    (() => {
                                                        switch (cell.column.id) {
                                                            case "memberSince": {
                                                                return format(cell.getValue() as string, "PPP")
                                                            }

                                                            case "name": {
                                                                const nameArray: string[] = (cell.getValue() as string).split(" ")
                                                                const firstName = nameArray.slice(0, 1)
                                                                const lastName = nameArray.slice(1)

                                                                return (<div className="flex items-center">
                                                                    <Avatar className="h-8 w-8 rounded-lg">
                                                                        <AvatarImage src={row.original.avatar} alt={row.original.name} className="object-cover" />
                                                                        <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600"><User2Icon size="16" /></AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col ml-2">
                                                                        <span>{firstName}</span>
                                                                        <span className="uppercase text-muted-foreground">{lastName}</span>
                                                                    </div>
                                                                </div>)
                                                            }

                                                            case "email": {
                                                                const email = cell.getValue() as string;
                                                                return (
                                                                    <div className="truncate" title={email}>
                                                                        {email}
                                                                    </div>
                                                                )
                                                            }

                                                            default:
                                                                return cell.column.columnDef.cell;
                                                        }
                                                    })(),
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
        </div>
    )
}
