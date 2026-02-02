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

import { BanIcon, Check, ChevronsUpDown, ExternalLinkIcon, KeyRoundIcon, Loader2Icon, NotebookPenIcon, PencilIcon, RefreshCcwIcon, SearchIcon, SettingsIcon, SquarePlusIcon, Trash2Icon, TriangleAlertIcon, User2Icon, UserPlus2Icon, Users2Icon, WorkflowIcon } from "lucide-react"
import { Button } from "../ui/button"
import React from "react";
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { UserInformationTable, type UserInformationBrief } from "../fragments/UserInformationTable";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ORGANIZATION_NAME } from "@/commons/strings";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { cn } from "@/lib/utils";
import type { GetUserListResponse } from "./DashboardPeopleList";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ProgressUpdateDialog } from "../fragments/ProgressUpdateDialog";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { Switch } from "../ui/switch";

export interface TeamInfoResponse {
    team: TeamInfo,
    subteams: TeamInfo[]
}

export interface TeamInfo {
    pk: string,
    name: string,
    users: UserInformationBrief[],
    attributes: {
        description: any;
        friendlyName: string,
        teamType: string,
        seasonType: string,
        seasonYear: number,
        rootTeamSettings?: any
        flaggedForDeletion?: boolean
    }
}

interface BindleInformation {
    friendlyName: string,
    description: string
}

interface RootTeamSettingInfo {
    friendlyName: string,
    description: string
}

interface BindleDefinitionMap {
    /* Client Name */
    [key: string]: {
        /* Bindle ID */
        [key: string]: BindleInformation
    }
}

interface RootTeamSettingMap {
    /* Client Name */
    [key: string]: {
        /* Setting ID */
        [key: string]: RootTeamSettingInfo
    }
}

export const DashboardTeamInfo = () => {
    const params = useParams()
    const navigate = useNavigate()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>([]);
    const [settingDefinitions, setSettingDefinitions] = React.useState<RootTeamSettingMap>({});
    const [addMembersOpen, setAddMembersOpen] = React.useState(false);
    const [subteamsOpen, setSubteamsOpen] = React.useState(false);
    const [teamSettingsOpen, setTeamSettingsOpen] = React.useState(false);
    const [isSavingSettings, setIsSavingSettings] = React.useState(false);

    const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = React.useState(false);
    const [isRemovingMember, setIsRemovingMember] = React.useState(false);
    const [removalPendingInfo, setRemovalPendingInfo] = React.useState<{ user: UserInformationBrief, teamPk: string, teamName: string } | null>(null);

    const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
    const [syncDialogTitle, setSyncDialogTitle] = React.useState("");
    const [syncDialogDescription, setSyncDialogDescription] = React.useState("");
    const [syncDialogProgress, setSyncDialogProgress] = React.useState(0);
    const [syncDialogStatus, setSyncDialogStatus] = React.useState("");



    const refreshTeamInfo = () => {
        return Promise.all([
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`).then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.message || "Failed to fetch team");
                return data;
            }),
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teamsettings`).then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.message || "Failed to fetch settings");
                return data;
            })
        ])
            .then(([teamlistResponse, definitions]) => {
                setTeamInfo(teamlistResponse.team)
                setSubTeams(teamlistResponse.subteams)
                setSettingDefinitions(definitions)
            })
            .catch((e) => {
                toast.error("Failed to Fetch Team Information: " + e.message)
            })
    }

    React.useEffect(() => {
        refreshTeamInfo()
    }, []);

    function syncBindles() {
        /* Reset State and Open Sync Dialog */
        setSyncDialogProgress(0)
        setSyncDialogStatus("Connecting to Server...")
        setSyncDialogTitle("Syncing Shared Permissions")
        setSyncDialogDescription("Please wait while the permissions propagate across Shared Resources")
        setSyncDialogOpen(true)

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/syncbindles`, {
            method: "PATCH"
        }).then(async response => {
            if (!response.body) {
                console.error("no body")
                return
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;

                const update = JSON.parse(decoder.decode(value, { stream: true }));
                setSyncDialogProgress(update.progressPercent)
                setSyncDialogStatus(update.status)
            }

            /* Sync Completed */
            setSyncDialogOpen(false);
            toast.success(`Shared Permissions Synced for the ${teamInfo?.attributes.friendlyName} team!`)
        }).catch(e => {
            toast.error(`Shared Permissions Sync Failure: ${e.message}`)
        });
    }

    function saveRootTeamSettings(settings: { [clientName: string]: { [settingKey: string]: boolean } }) {
        setIsSavingSettings(true);

        // 2. Save settings to server first
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/updateconf`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        })
            .then(async response => {
                if (!response.ok) {
                    const responseData = await response.json();
                    throw new Error(responseData.message || `Settings Update Failed: HTTP ${response.status}`);
                }
            })
            .then(() => {
                toast.success("Team settings saved successfully!");
                setTeamSettingsOpen(false);
                return refreshTeamInfo();
            })
            .catch(e => {
                toast.error(`Failed to save settings: ${e.message}`);
            })
            .finally(() => {
                setIsSavingSettings(false);
            });
    }

    const handleTeamInfoChange = (name: string, description: string) => {
        if (!name.trim()) {
            toast.error("Name cannot be blank!");
            return;
        }

        if (!description.trim()) {
            toast.error("Description cannot be blank!");
            return;
        }

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friendlyName: name,
                description: description
            })
        }).then(async attrResponse => {
            if (!attrResponse.ok) {
                const responseData = await attrResponse.json();
                throw new Error(responseData.message || `Attributes Update Failed: HTTP ${attrResponse.status}`);
            }

            toast.success(`Updated details for ${name}!`);
            refreshTeamInfo();
        }).catch(e => {
            toast.error(`Failed to update team details: ${e.message}`);
        });
    }

    function generateAWSMagicLink() {
        setSyncDialogProgress(0)
        setSyncDialogStatus("Connecting to Server...")
        setSyncDialogTitle("Preparing AWS Console Session")
        setSyncDialogDescription("Please wait while a new AWS Console session is created. You'll be redirected automatically.")
        setSyncDialogOpen(true)

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/awsaccess`)
            .then(async response => {
                if (!response.body) return console.error("no body");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const textChunk = decoder.decode(value, { stream: true });
                    const updates: any[] = [];

                    try {
                        updates.push(JSON.parse(textChunk));
                    } catch {
                        (textChunk.match(/\{.*?\}/g) || []).forEach(m => {
                            try { updates.push(JSON.parse(m)); } catch { }
                        });
                    }

                    for (const update of updates) {
                        if (update.error) {
                            toast.error(update.status);
                            setSyncDialogOpen(false);
                            return;
                        }

                        setSyncDialogProgress(update.progressPercent);
                        setSyncDialogStatus(update.status);

                        if (update.link) {
                            setSyncDialogOpen(false);
                            window.open(update.link, "_blank");
                        }
                    }
                }
            }).catch(e => {
                setSyncDialogOpen(false);
                toast.error(`Failed to generate magic link: ${e.message}`)
            });
    }

    const handleRemoveMember = (user: UserInformationBrief, teamPk: string, teamName: string) => {
        setRemovalPendingInfo({ user, teamPk, teamName });
        setRemoveMemberDialogOpen(true);
    }

    const executeMemberRemoval = () => {
        if (!removalPendingInfo) return;

        const { user, teamPk, teamName } = removalPendingInfo;

        setIsRemovingMember(true);
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamPk}/removemember`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userPk: user.pk })
        }).then(async (res) => {
            if (res.ok) {
                toast.success(`Removed ${user.name} from ${teamName}!`);
                refreshTeamInfo();
                setRemoveMemberDialogOpen(false);
                setRemovalPendingInfo(null);
            } else {
                const errorData = await res.json();
                toast.error(`Failed to remove ${user.name}: ${errorData.message || `HTTP ${res.status}`}`);
            }
        }).catch((err) => {
            toast.error(`Failed to remove ${user.name}: ${err.message}`);
        }).finally(() => {
            setIsRemovingMember(false);
        });
    }

    return (
        <div className="flex flex-col m-2">
            <RemoveMemberDialog
                open={removeMemberDialogOpen}
                onOpenChange={setRemoveMemberDialogOpen}
                user={removalPendingInfo?.user}
                teamName={removalPendingInfo?.teamName}
                onConfirm={executeMemberRemoval}
                isLoading={isRemovingMember}
            />

            <AddTeamMembersDialog open={addMembersOpen} openChanged={setAddMembersOpen} teamPk={teamInfo?.pk} subteams={subTeams.filter((t) => !t.attributes.flaggedForDeletion)} />
            <ProgressUpdateDialog open={syncDialogOpen} title={syncDialogTitle} description={syncDialogDescription} status={syncDialogStatus} progressPercent={syncDialogProgress} />
            <SubteamsInfoDialog open={subteamsOpen} openChanged={setSubteamsOpen} subteams={subTeams} onRefresh={refreshTeamInfo} parentTeamId={teamInfo?.pk} />
            <TeamSettingsDialog open={teamSettingsOpen} openChanged={setTeamSettingsOpen} teamInfo={teamInfo} settingDefinitions={settingDefinitions} isSaving={isSavingSettings} onSave={saveRootTeamSettings} onTeamInfoChange={handleTeamInfoChange} />

            <div className="flex items-center">
                <div className="flex flex-col flex-grow-1">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{teamInfo?.attributes.friendlyName} <span className="text-2xl ml-1 text-muted-foreground">{`${teamInfo?.attributes.seasonType} ${teamInfo?.attributes.seasonYear}`}</span></h1>
                    <h4 className="text-xl text-muted-foreground">{teamInfo?.attributes.description}</h4>
                </div>

                <Button className="cursor-pointer" onClick={() => { setAddMembersOpen(true) }}>
                    <UserPlus2Icon />
                    Add Members
                </Button>
            </div>

            <div className="mt-3">
                <h3 className="text-lg">Manage Your Team</h3>
                <div className="flex gap-2 mt-2">
                    <Button onClick={() => navigate("./recruitment")} variant="outline" className="cursor-pointer">
                        <NotebookPenIcon />
                        Recruitment
                    </Button>

                    <Button onClick={() => setSubteamsOpen(true)} variant="outline" className="cursor-pointer">
                        <WorkflowIcon />
                        Manage Subteams
                    </Button>

                    <Button onClick={syncBindles} variant="outline" className="cursor-pointer">
                        <RefreshCcwIcon />
                        Sync Shared Permissions
                    </Button>

                    <Button onClick={() => setTeamSettingsOpen(true)} variant="outline" className="cursor-pointer">
                        <SettingsIcon />
                        Team Settings
                    </Button>
                </div>
            </div>

            <div className="mt-3">
                <h3 className="text-lg">Team Resources</h3>
                <div className="flex gap-2 mt-2">
                    <Button onClick={generateAWSMagicLink} variant="outline" className="cursor-pointer">
                        <ExternalLinkIcon />
                        Open AWS Console
                    </Button>
                </div>
            </div>


            <Tabs key={teamInfo?.pk ?? "loading"} className="mt-5" defaultValue={(teamInfo?.attributes.seasonType === "ROLLING") ? (subTeams?.filter(st => !st.attributes.flaggedForDeletion)[0]?.name ?? "owner") : "owner"}>
                <h3 className="text-lg">Who's on my Team?</h3>
                <TabsList>
                    {
                        /* We're a Special Team if the Season is Rolling. Janky but fine. */
                        (teamInfo?.attributes.seasonType === "ROLLING") ?
                            <></> : <TabsTrigger value="owner">Team Owners</TabsTrigger>
                    }
                    {
                        subTeams?.filter(st => !st.attributes.flaggedForDeletion).map((subteam) => {
                            let tabName = subteam.attributes.friendlyName;
                            if (tabName.endsWith("Engr"))
                                tabName = "Engineering Team"

                            else if (tabName.endsWith("Lead"))
                                tabName = "Project Leadership"

                            return (<TabsTrigger value={subteam.name}>{tabName}</TabsTrigger>)
                        })
                    }
                </TabsList>

                <div className="">
                    <TabsContent value="owner">
                        <UserInformationTable
                            users={teamInfo?.users ?? []}
                            teamPk={teamInfo?.pk}
                            onRemove={user => handleRemoveMember(user, teamInfo?.pk ?? "", teamInfo?.attributes.friendlyName ?? "")}
                        />
                    </TabsContent>

                    {
                        subTeams?.filter(st => !st.attributes.flaggedForDeletion).map((subteam) => (
                            <TabsContent value={subteam.name}>
                                <UserInformationTable
                                    users={subteam.users ?? []}
                                    teamPk={subteam.pk}
                                    onRemove={user => handleRemoveMember(user, subteam.pk, subteam.attributes.friendlyName)}
                                />
                            </TabsContent>
                        ))
                    }
                </div>
            </Tabs>
        </div>
    )
}

const AddTeamMembersDialog = (props: { teamPk?: string, subteams: TeamInfo[], open: boolean, openChanged: (open: boolean, refresh?: boolean) => void }) => {
    const [currentTab, setCurrentTab] = React.useState("")
    const [selectedSubTeam, setSelectedSubTeam] = React.useState<TeamInfo>()
    const [selectedExistingMember, setSelectedExistingMember] = React.useState<UserInformationBrief>()
    const [subTeamSelectionOpen, setSubTeamSelectionOpen] = React.useState(false)

    const [isLoading, setIsLoading] = React.useState(false);
    const [isFormComplete, setIsFormComplete] = React.useState(false)
    const [inviteEmailAddress, setInviteEmailAddress] = React.useState("")
    const [inviteeName, setInviteeName] = React.useState("")
    const [roleTitle, setRoleTitle] = React.useState("")

    React.useEffect(() => {
        setIsFormComplete(selectedSubTeam !== undefined &&
            !!roleTitle.trim() &&
            (
                currentTab === "existing"
                    ? !!selectedExistingMember
                    : !!inviteEmailAddress.trim() && !!inviteeName.trim()
            ))
    }, [
        selectedSubTeam, selectedExistingMember,
        currentTab, roleTitle, inviteEmailAddress, inviteeName
    ])

    const handleMemberAdd = async () => {
        if (currentTab == "existing") {
            if (!selectedSubTeam || !selectedExistingMember)
                return

            setIsLoading(true)
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${selectedSubTeam.pk}/addmember`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userPk: selectedExistingMember.pk,
                    roleTitle
                })
            }).then(async (res) => {
                if (!res.ok)
                    throw new Error((await res.json()).message)

                toast.success(`Added ${selectedExistingMember.name} to your team!`)
                props.openChanged(false, true)
            }).catch((err) => {
                toast.error(`Failed to add ${selectedExistingMember.name} to your team! Error: ${err.message}`)
                props.openChanged(false)
            }).finally(() => { setIsLoading(false) })
        } else if (currentTab == "invite") {
            if (!selectedSubTeam || !props.teamPk)
                return

            setIsLoading(true)
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${props.teamPk}/externalinvite`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inviteeName,
                    inviteeEmail: inviteEmailAddress,
                    roleTitle,
                    subteamPk: selectedSubTeam.pk,
                })
            }).then(async (res) => {
                if (!res.ok)
                    throw new Error((await res.json()).message)

                toast.success(`Invite for ${inviteeName} sent to ${inviteEmailAddress}!`)
                props.openChanged(false, true)
            }).catch((err) => {
                toast.error(`Failed to send invite to ${inviteEmailAddress}! Error: ${err.message}`)
                props.openChanged(false)
            }).finally(() => { setIsLoading(false) })
        }
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <form>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                            Yay! We're happy that you're growing your team, thanks for helping the {ORGANIZATION_NAME} grow 🥳
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Tabs onValueChange={(e) => { setCurrentTab(e) }} className="w-full" value={currentTab} defaultValue="existing">
                            <TabsList className="w-full">
                                <TabsTrigger value="existing">Existing Members</TabsTrigger>
                                <TabsTrigger value="invite">Invite Member</TabsTrigger>
                            </TabsList>

                            <TabsContent className="flex flex-col gap-2" value="existing">
                                <Label className="mt-2">Member Name</Label>
                                <MembersFilterPopover handleSelect={(val) => setSelectedExistingMember(val)} />
                            </TabsContent>

                            <TabsContent className="flex flex-col gap-2" value="invite">
                                <Alert>
                                    <TriangleAlertIcon />
                                    <AlertTitle>Recruitment Override Warning</AlertTitle>
                                    <AlertDescription>
                                        By directly adding a member, you're bypassing App Dev's standard recruitment procedures. Please use this feature only if
                                        you are entirely sure that this person would be a great fit for the team and that they would align with App Dev's culture and standards.
                                    </AlertDescription>
                                </Alert>

                                <Label className="mt-2">Candidate's Name</Label>
                                <Input value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} placeholder="Ex. Atheesh Thirumalairajan" />

                                <Label className="mt-2">Candidate's Email Address</Label>
                                <Input value={inviteEmailAddress} onChange={(e) => setInviteEmailAddress(e.target.value)} placeholder="Ex. atheesh@terpmail.umd.edu" />
                            </TabsContent>
                        </Tabs>


                        <Label className="mt-2">Role Title</Label>
                        <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Ex. Software Engineer" />

                        <Label className="mt-2">Select Subteam</Label>
                        <Popover modal open={subTeamSelectionOpen} onOpenChange={setSubTeamSelectionOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                >
                                    {selectedSubTeam
                                        ? selectedSubTeam.name
                                        : "Select a Permissions Group"}
                                    <ChevronsUpDown className="opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandList>
                                        <CommandGroup>
                                            {props.subteams.map((team) => {
                                                const teamDisplayName = `${team.attributes.friendlyName} (${team.attributes.description})`
                                                const teamDisplayDesc = team.name

                                                return (
                                                    <CommandItem
                                                        key={team.name}
                                                        value={team.name}
                                                        onSelect={(_) => {
                                                            setSelectedSubTeam(_ => team)
                                                            setSubTeamSelectionOpen(false)
                                                        }}
                                                    >
                                                        <Avatar className="h-8 w-8 rounded-lg">
                                                            <AvatarFallback className="rounded-lg"><KeyRoundIcon size="16" /></AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span>{teamDisplayName}</span>
                                                            <span className="text-muted-foreground">{teamDisplayDesc}</span>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "ml-auto",
                                                                selectedSubTeam?.name === team.name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button disabled={!isFormComplete || isLoading} onClick={handleMemberAdd}>
                            <Loader2Icon className={cn("animate-spin", !isLoading ? "hidden" : "")} />
                            {(currentTab == "existing") ? "Add Member" : "Invite Member"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}

const MembersFilterPopover = (props: { handleSelect: (member: UserInformationBrief) => void }) => {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")
    const [selected, setSelected] = React.useState<UserInformationBrief>();
    const [filteredMembers, setFilteredMembers] = React.useState<UserInformationBrief[]>([])
    const [isLoading, setIsLoading] = React.useState(false);

    const getFilteredMembersList = (search: string) => {
        setSearchValue(search)
        if (search.trim().length < 3)
            return;

        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people?search=${search}`)
            .then(async (response) => {
                const userlistResponse: GetUserListResponse = await response.json()
                setFilteredMembers((_members) => userlistResponse.users)
            })
            .catch((e) => {
                toast.error("Failed to Fetch People List: " + e.message)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    return (
        <Popover modal open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selected
                        ? selected.name
                        : "Select an Existing Member"}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CustomPopoverFilterBox isLoading={isLoading} onChange={(e) => getFilteredMembersList(e.target.value)} />
                    <CommandList>
                        <CommandEmpty>{(searchValue.length < 3) ? "Start Typing to Search..." : "No Members Found!"}</CommandEmpty>
                        <CommandGroup>
                            {filteredMembers.map((member) => (
                                <CommandItem
                                    key={member.pk}
                                    value={`${member.name} (${member.username})`}
                                    onSelect={(_) => {
                                        setSelected(_ => member)
                                        props.handleSelect(member)
                                        setOpen(false)
                                    }}
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={member.avatar} alt={member.name} className="object-cover" />
                                        <AvatarFallback className="rounded-lg"><User2Icon size="16" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{member.name}</span>
                                        <span className="text-muted-foreground">{member.username}</span>
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            selected?.username === member.username ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

const SubteamsInfoDialog = (props: {
    open: boolean,
    openChanged: (open: boolean) => void,
    subteams: TeamInfo[],
    onRefresh: () => void,
    parentTeamId?: string
}) => {
    const [currentSubTeam, setCurrentSubTeam] = React.useState<TeamInfo>()
    const [bindleDefinitions, setBindleDefinitions] = React.useState<BindleDefinitionMap>({})
    const [enabledBindles, setEnabledBindles] = React.useState<{ [key: string]: { [key: string]: boolean } }>({})
    const [isLoadingBindles, setIsLoadingBindles] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [editDetailsOpen, setEditDetailsOpen] = React.useState(false);
    const [subteamCreateOpen, setSubteamCreateOpen] = React.useState(false);
    const [removeSubteamOpen, setRemoveSubteamOpen] = React.useState(false);
    const [subteamToDelete, setSubteamToDelete] = React.useState<TeamInfo | undefined>();

    const sortedSubteams = React.useMemo(() => {
        return [...props.subteams].sort((a, b) => a.attributes.friendlyName.localeCompare(b.attributes.friendlyName))
    }, [props.subteams])

    React.useEffect(() => {
        if (props.open && !currentSubTeam)
            setCurrentSubTeam(sortedSubteams[0])
    }, [props.open, sortedSubteams]);

    // Sync currentSubTeam with updated props after refresh to reflect saved changes
    React.useEffect(() => {
        setCurrentSubTeam(prev => {
            if (!prev) return prev;
            const updated = props.subteams.find(s => s.pk === prev.pk);
            return updated || prev;
        });
    }, [props.subteams])

    React.useEffect(() => {
        if (!currentSubTeam) return;

        setIsLoadingBindles(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${currentSubTeam.pk}/bindles`)
            .then(async (response) => {
                const fetchedBindles = await response.json()
                setEnabledBindles(fetchedBindles)
            })
            .catch((e) => {
                toast.error("Failed to Fetch Team Bindles: " + e.message)
            })
            .finally(() => { setIsLoadingBindles(false) })
    }, [currentSubTeam?.pk])

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/bindles/definitions`)
            .then(async (response) => {
                const fetchedBindleDefinitions = await response.json()
                setBindleDefinitions(_ => (fetchedBindleDefinitions))
            })
            .catch((e) => {
                toast.error("Failed to Bindle Permissions: " + e.message)
            })
    }, [])

    function normalizeClientName(clientName: string) {
        switch (clientName) {
            case "GiteaClient":
                return "Git Permissions"

            case "SlackClient":
                return "Slack Permissions"

            case "AppleAccountClient":
                return "Apple Account"

            case "PeoplePortalClient":
                return "People Portal Access"

            default:
                return clientName
        }
    }

    const updateSubTeamBindles = () => {
        if (!currentSubTeam) return;

        setIsSaving(true);
        const friendlyName = currentSubTeam.attributes.friendlyName

        // 1. Update bindles
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${currentSubTeam.pk}/bindles`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(enabledBindles)
        })
            .then(async response => {
                if (!response.ok) {
                    const responseData = await response.json();
                    throw new Error(responseData.message || `Bindle Update Failed: HTTP ${response.status}`);
                }
            })
            .then(() => {
                toast.success(`Settings updated for ${friendlyName}!`);
                props.onRefresh();
            })
            .catch(e => {
                toast.error(`Failed to update subteam: ${e.message}`);
            })
            .finally(() => {
                setIsSaving(false);
            });
    }

    const handleSubteamInfoChange = (name: string, description: string) => {
        if (!currentSubTeam) return;

        if (!name.trim()) {
            toast.error("Name cannot be blank!");
            return;
        }

        if (!description.trim()) {
            toast.error("Description cannot be blank!");
            return;
        }

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${currentSubTeam.pk}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friendlyName: name,
                description: description
            })
        }).then(async attrResponse => {
            if (!attrResponse.ok) {
                const responseData = await attrResponse.json();
                throw new Error(responseData.message || `Attributes Update Failed: HTTP ${attrResponse.status}`);
            }

            toast.success(`Updated details for ${name}!`);
            props.onRefresh();

            setCurrentSubTeam(prev => prev ? ({
                ...prev,
                attributes: {
                    ...prev.attributes,
                    friendlyName: name,
                    description: description
                }
            }) : prev)

        }).catch(e => {
            toast.error(`Failed to update subteam details: ${e.message}`);
        });
    }

    const handleSubteamCreateSubmit = (name: string, description: string) => {
        if (!name.trim()) {
            toast.error("Name cannot be blank!");
            return;
        }

        if (!description.trim()) {
            toast.error("Description cannot be blank!");
            return;
        }

        setIsSaving(true);
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${props.parentTeamId}/subteam`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friendlyName: name,
                description: description
            })
        }).then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.message || res.statusText) });
            }
            return res.json();
        }).then(() => {
            toast.success(`Subteam ${name} created successfully!`);
            setSubteamCreateOpen(false);
            props.onRefresh();
        }).catch(err => {
            toast.error(`Failed to create subteam: ${err.message}`);
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleSubteamDeleteSubmit = () => {
        if (!subteamToDelete) return;

        setIsSaving(true);
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${subteamToDelete.pk}`, {
            method: "DELETE",
        }).then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.message || res.statusText) });
            }

            // If response has body, parse it, else return null
            return res.text().then(text => text ? JSON.parse(text) : {});
        }).then(() => {
            toast.success(`Subteam ${subteamToDelete.attributes.friendlyName} deleted successfully!`);
            setRemoveSubteamOpen(false);
            setSubteamToDelete(undefined);
            props.onRefresh();
        }).catch(err => {
            toast.error(`Failed to delete subteam: ${err.message}`);
        }).finally(() => {
            setIsSaving(false);
        });
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="min-w-[60%] h-[80vh] p-0 select-none">
                <div className="flex h-full w-full overflow-hidden">
                    <SidebarGroup className="w-[30%] h-full overflow-y-auto border-r select-none">
                        <SidebarGroupLabel className="mb-1">Subteams and Permissions</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {/* Dynamic Subteam Population */}
                                {sortedSubteams.map((subteam) => (
                                    <SidebarMenuItem key={subteam.pk}>
                                        <SidebarMenuButton
                                            className="cursor-pointer h-8"
                                            onClick={() => { if (!subteam.attributes.flaggedForDeletion) setCurrentSubTeam(_ => subteam) }}
                                            isActive={currentSubTeam?.pk == subteam.pk}
                                            disabled={subteam.attributes.flaggedForDeletion}
                                            asChild
                                        >
                                            <a>
                                                <Users2Icon className={subteam.attributes.flaggedForDeletion ? "opacity-50" : ""} />
                                                <span className={subteam.attributes.flaggedForDeletion ? "line-through opacity-50" : ""}>
                                                    {subteam.attributes.friendlyName}
                                                </span>
                                                <div className="ml-auto">
                                                    <Button
                                                        onClick={(e) => { e.stopPropagation(); setSubteamToDelete(subteam); setRemoveSubteamOpen(true); }}
                                                        disabled={subteam.attributes.flaggedForDeletion}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        {
                                                            (subteam.attributes.flaggedForDeletion) ? <BanIcon size={15} /> :
                                                                <Trash2Icon size={15} />
                                                        }
                                                    </Button>
                                                </div>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}

                                <SidebarMenuButton className="cursor-pointer h-8" onClick={() => setSubteamCreateOpen(true)} asChild>
                                    <a>
                                        <SquarePlusIcon />
                                        <span>Create new Subteam</span>
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <div className="flex flex-col flex-grow-1 p-4 h-full min-h-0 overflow-hidden">
                        <EditDetailsDialog
                            open={editDetailsOpen}
                            onOpenChange={setEditDetailsOpen}
                            title="Edit Subteam Details"
                            description="Update the name and description for this subteam."
                            initialName={currentSubTeam?.attributes.friendlyName || ""}
                            initialDescription={currentSubTeam?.attributes.description || ""}
                            onSave={(n, d) => { handleSubteamInfoChange(n, d); setEditDetailsOpen(false) }}
                        />

                        <EditDetailsDialog
                            open={subteamCreateOpen}
                            onOpenChange={setSubteamCreateOpen}
                            title="Create New Subteam"
                            description="Add a new subteam to your team."
                            initialName=""
                            initialDescription=""
                            onSave={handleSubteamCreateSubmit}
                            isLoading={isSaving}
                            submitText="Create Subteam"
                        />

                        <RemoveSubteamDialog
                            open={removeSubteamOpen}
                            onOpenChange={setRemoveSubteamOpen}
                            subteam={subteamToDelete}
                            onConfirm={handleSubteamDeleteSubmit}
                            isLoading={isSaving}
                        />

                        <div className="flex items-center gap-2">
                            <div className="flex flex-col flex-grow-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl">{currentSubTeam?.attributes.friendlyName}</h1>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-[-5px] cursor-pointer" onClick={() => setEditDetailsOpen(true)}>
                                        <PencilIcon />
                                    </Button>
                                    {isLoadingBindles && <Loader2Icon className="animate-spin text-muted-foreground" size={20} />}
                                </div>
                                <p className="text-muted-foreground">{currentSubTeam?.attributes.description}</p>
                            </div>
                        </div>

                        <div className="flex flex-grow-1 flex-col mt-2 overflow-y-auto min-h-0">
                            {
                                Object.keys(bindleDefinitions).map((sharedResource) => (
                                    <div className="flex flex-col mt-2">
                                        {
                                            Object.keys(bindleDefinitions[sharedResource]).length < 1 ? <></> :
                                                <p className="text-muted-foreground text-sm">{normalizeClientName(sharedResource)}</p>
                                        }

                                        {
                                            Object.keys(bindleDefinitions[sharedResource]).map((bindleEntry) => {
                                                const bindleDefinition = bindleDefinitions[sharedResource][bindleEntry]

                                                return (
                                                    <div className="flex border-1 p-2 rounded-md mt-2 items-center">
                                                        <div className="flex flex-col text-sm flex-grow-1 mr-6">
                                                            <p>{bindleDefinition.friendlyName}</p>
                                                            <p className="text-muted-foreground text-sm">{bindleDefinition.description}</p>
                                                        </div>

                                                        <Switch
                                                            checked={enabledBindles[sharedResource]?.[bindleEntry] === true}
                                                            onCheckedChange={(checked) => {
                                                                setEnabledBindles(prev => ({
                                                                    ...prev,
                                                                    [sharedResource]: {
                                                                        ...prev[sharedResource],
                                                                        [bindleEntry]: checked
                                                                    }
                                                                }))
                                                            }}
                                                        />
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                ))
                            }
                        </div>

                        <DialogFooter className="mt-4 flex-grow-1">
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button disabled={isSaving} onClick={updateSubTeamBindles}>
                                <Loader2Icon className={cn("animate-spin", !isSaving ? "hidden" : "")} />
                                Save Changes for {currentSubTeam?.attributes.friendlyName}
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

const TeamSettingsDialog = (props: {
    open: boolean,
    openChanged: (open: boolean) => void,
    teamInfo?: TeamInfo,
    settingDefinitions: RootTeamSettingMap,
    isSaving: boolean,
    onSave: (settings: { [clientName: string]: { [settingKey: string]: boolean } }) => void,
    onTeamInfoChange: (name: string, description: string) => void
}) => {
    // Store settings grouped by client name: { "AWSClient": { "awsclient:provision": true } }
    const [changedSettings, setChangedSettings] = React.useState<{ [clientName: string]: { [settingKey: string]: boolean } }>({})
    const [localAttributes, setLocalAttributes] = React.useState({ friendlyName: "", description: "" })
    const [editDetailsOpen, setEditDetailsOpen] = React.useState(false)

    /* Initialize settings when dialog opens or teamInfo/settingDefinitions change */
    React.useEffect(() => {
        if (!props.open || !props.teamInfo) return;

        const rootTeamSettings = props.teamInfo.attributes.rootTeamSettings || {};

        // Build the initial settings object with all defined settings
        const initialSettings: { [clientName: string]: { [settingKey: string]: boolean } } = {};

        // Iterate through all defined settings and initialize them
        for (const clientName in props.settingDefinitions) {
            initialSettings[clientName] = {};
            for (const settingKey in props.settingDefinitions[clientName]) {
                // Get the value from existing settings, or default to false
                const existingValue = rootTeamSettings[clientName]?.[settingKey];
                initialSettings[clientName][settingKey] = existingValue ?? false;
            }
        }

        setChangedSettings(initialSettings);
        setLocalAttributes({
            friendlyName: props.teamInfo.attributes.friendlyName || "",
            description: props.teamInfo.attributes.description || ""
        });
    }, [props.open, props.teamInfo, props.settingDefinitions]);


    function normalizeClientName(clientName: string) {
        switch (clientName) {
            case "AWSClient":
                return "Amazon Web Services"
            default:
                return clientName
        }
    }

    const toggleSetting = (clientName: string, settingKey: string, currentValue: boolean) => {
        setChangedSettings(prev => ({
            ...prev,
            [clientName]: {
                ...prev[clientName],
                [settingKey]: !currentValue
            }
        }))
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="min-w-lg min-h-[60%] p-0 select-none">
                <div className="flex-grow-1 m-4">
                    <EditDetailsDialog
                        open={editDetailsOpen}
                        onOpenChange={setEditDetailsOpen}
                        title="Edit Team Details"
                        description="Update the name and description for your team."
                        initialName={localAttributes.friendlyName}
                        initialDescription={localAttributes.description}
                        onSave={(n, d) => { props.onTeamInfoChange(n, d); setEditDetailsOpen(false) }}
                    />
                    <h1 className="text-2xl">Team Settings</h1>
                    <h3 className="text-muted-foreground">Configure Root Team Attributes</h3>

                    <div className="flex flex-col mt-4">
                        {/* Static, Rename Settings */}
                        <p className="text-muted-foreground text-sm">Team Information</p>
                        <div className="flex border-1 p-2 rounded-md mt-2 items-center">
                            <div className="flex flex-col text-sm flex-grow-1">
                                <p>Name and Description</p>
                                <p className="text-muted-foreground text-sm">Configure your team's name and description</p>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => setEditDetailsOpen(true)}>Edit Details</Button>
                        </div>

                        {
                            /* Dynamic Root Team Settings */
                            Object.keys(props.settingDefinitions).map((clientName) => (
                                <div key={clientName} className="flex flex-col mt-4">
                                    <p className="text-muted-foreground text-sm">{normalizeClientName(clientName)}</p>
                                    {
                                        Object.keys(props.settingDefinitions[clientName]).map((settingKey) => {
                                            const settingDefinition = props.settingDefinitions[clientName][settingKey]
                                            const isChecked = changedSettings[clientName]?.[settingKey] || false;

                                            return (
                                                <div key={settingKey} className="flex border-1 p-2 rounded-md mt-2 items-center">
                                                    <div className="flex flex-col text-sm flex-grow-1">
                                                        <p>{settingDefinition.friendlyName}</p>
                                                        <p className="text-muted-foreground text-sm">{settingDefinition.description}</p>
                                                    </div>

                                                    <Switch checked={isChecked} onCheckedChange={() => toggleSetting(clientName, settingKey, isChecked)} />
                                                </div>
                                            )
                                        })

                                    }
                                </div>
                            ))
                        }
                    </div>
                    <DialogFooter className="absolute bottom-4 right-4 flex gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button disabled={props.isSaving} onClick={() => props.onSave(changedSettings)}>
                            <Loader2Icon className={cn("animate-spin", !props.isSaving ? "hidden" : "")} />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}


const CustomPopoverFilterBox = (props: React.ComponentProps<"input"> & { isLoading?: boolean }) => {
    return (
        <div
            data-slot="command-input-wrapper"
            className="flex h-9 items-center border-b px-3"
        >
            <SearchIcon className="size-4 shrink-0 opacity-50" />
            <Input
                data-slot="command-input"
                className="focus-visible:ring-0 border-none !bg-transparent placeholder:text-muted-foreground flex h-10 w-full rounded-md py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                {...props}
            />

            <Loader2Icon className={`animate-spin ${(!props.isLoading) ? "invisible" : ""}`} />
        </div>
    )
}

const EditDetailsDialog = (props: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    title: string,
    description: string,
    initialName: string,
    initialDescription: string,
    onSave: (name: string, description: string) => void,
    isLoading?: boolean,
    submitText?: string
}) => {
    const [name, setName] = React.useState(props.initialName)
    const [description, setDescription] = React.useState(props.initialDescription)

    React.useEffect(() => {
        setName(props.initialName)
        setDescription(props.initialDescription)
    }, [props.open, props.initialName, props.initialDescription])

    const handleSave = () => {
        props.onSave(name, description)
        // props.onOpenChange(false) - Controlled by parent
    }

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{props.title}</DialogTitle>
                    <DialogDescription>
                        {props.description}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-details-name">Name</Label>
                        <Input
                            id="edit-details-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-details-description">Description</Label>
                        <Input
                            id="edit-details-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
                    <Button disabled={props.isLoading} onClick={handleSave}>
                        <Loader2Icon className={cn("animate-spin", !props.isLoading ? "hidden" : "")} />
                        {props.submitText ?? "Update Info"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const RemoveMemberDialog = (props: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    user?: UserInformationBrief,
    teamName?: string,
    onConfirm: () => void,
    isLoading: boolean
}) => {
    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Member Removal</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <strong>{props.user?.name}</strong> from the <strong>{props.teamName}</strong> team?
                        This will revoke their access to team resources immediately.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" disabled={props.isLoading} onClick={props.onConfirm}>
                        <Loader2Icon className={cn("animate-spin", !props.isLoading ? "hidden" : "")} />
                        Remove Member
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const RemoveSubteamDialog = (props: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    subteam?: TeamInfo,
    onConfirm: () => void,
    isLoading: boolean
}) => {
    const [confirmName, setConfirmName] = React.useState("")

    React.useEffect(() => {
        if (props.open) {
            setConfirmName("")
        }
    }, [props.open])

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {props.subteam?.attributes.friendlyName} Subteam?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone and will remove all members from this subteam. Additionally, all subteam members
                        will lose access to inherited team resources immideately.
                    </DialogDescription>
                </DialogHeader>

                <Input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={`Type "${props.subteam?.attributes.friendlyName}" to confirm`}
                />

                <DialogFooter>
                    <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
                    <Button
                        variant="destructive"
                        disabled={props.isLoading || confirmName !== props.subteam?.attributes.friendlyName}
                        onClick={props.onConfirm}
                    >
                        <Loader2Icon className={cn("animate-spin", !props.isLoading ? "hidden" : "")} />
                        Delete {props.subteam?.attributes.friendlyName} Subteam
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
