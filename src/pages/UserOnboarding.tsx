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

import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ORGANIZATION_NAME } from '@/commons/strings'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar'
import { Check, CheckCircle2Icon, ChevronsUpDown, Loader2Icon, Lock, MessagesSquare, Minus, Plus, Signature, TriangleAlertIcon, UploadCloudIcon, User2Icon, XCircleIcon } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PhoneInput } from '@/components/ui/phone-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from '@/commons/config'
import zxcvbn from 'zxcvbn'
import { Progress } from '@/components/ui/progress'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'

interface CompleteSetupStageProps {
    stages: { name: string, status: boolean }[],
    stepComplete: () => void,
    isLoading: boolean
}

interface SlackJoinStageProps {
    email: string,
    slackInviteLink: string,
    defaultVerified: boolean,
    stepComplete: (joined: boolean) => void
}

interface CreatePasswordStageProps {
    name: string,
    email: string,
    teamName: string,
    role: string,
    defaultPassword: string,
    stepComplete: (createdPassword: string) => void
}

interface ProprietaryInformationStageProps {
    defaultSigned: boolean,
    stepComplete: (status: boolean) => void
}

interface PersonalInfoData {
    avatarKey?: string,
    profileUrl: string,
    major: UMDApiMajorListResponse,
    expectedGrad: string,
    phoneNumber: string
}

interface PersonalInfoStageProps {
    onboardId?: string,
    defaultData: PersonalInfoData | undefined,
    stepComplete: (data: PersonalInfoData) => void
}

interface UMDApiMajorListResponse {
    college: string,
    major_id: string,
    name: string,
    url: string
}

interface APIInviteInfo {
    inviteName: string;
    inviteEmail: string;
    roleTitle: string;
    subteamPk: string;
    teamName: string;
    inviterPk: number;
    expiresAt: Date;
    slackInviteLink: string;
}

export const UserOnboarding = () => {
    const params = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    const [isLoading, setIsLoading] = React.useState(false);
    const [inviteInfo, setInviteInfo] = React.useState<APIInviteInfo>()
    const slackJoinComplete = React.useRef(false);
    const ipAgreementComplete = React.useRef(false);
    const personalInfoRef = React.useRef<PersonalInfoData>(undefined);
    const createdPasswordRef = React.useRef("");
    const currentStepRef = React.useRef(0);

    const basePath = `/onboard/${params.onboardId}`
    const ONBOARDING_FLOWLIST = [
        { title: "Create Password", path: "loginsetup", icon: Lock },
        { title: "Personal Information", path: "identity", icon: User2Icon },
        { title: "Legal Agreements", path: "legal", icon: Signature },
        { title: "Join App Dev Slack", path: "slack", icon: MessagesSquare },
        { title: "Complete Setup", path: "complete", icon: CheckCircle2Icon }
    ]

    const handleNextStep = () => {
        const nextStep = currentStepRef.current + 1
        if (nextStep < ONBOARDING_FLOWLIST.length) {
            currentStepRef.current = currentStepRef.current + 1
            navigate(`${basePath}/${ONBOARDING_FLOWLIST[currentStepRef.current].path}`)
        } else {
            /* Steps are Complete! */
            handleFormSubmit()
        }
    }

    const handlePasswordSetupComplete = (password: string) => {
        createdPasswordRef.current = password
        handleNextStep()
    }

    const handlePersonalInfoComplete = (personalInfo: PersonalInfoData) => {
        personalInfoRef.current = personalInfo
        handleNextStep()
    }

    const handleIPAgreementComplete = (status: boolean) => {
        ipAgreementComplete.current = status;
        handleNextStep()
    }

    const handleSlackJoinComplete = (joined: boolean) => {
        /* Call Backend APIs to Verify Status */
        slackJoinComplete.current = joined
        handleNextStep()
    }

    const handleFormSubmit = () => {
        /* Send a Request to Create the User in Authentik, Setup Accounts, etc. */
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/invites/${params.onboardId}`, {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                password: createdPasswordRef.current,
                major: personalInfoRef.current?.major.name,
                expectedGrad: personalInfoRef.current?.expectedGrad,
                phoneNumber: personalInfoRef.current?.phoneNumber,
                avatarKey: personalInfoRef.current?.avatarKey
            })
        }).then((res) => {
            toast.success("Onboarding Complete!", {
                description: "You'll automatically be redirected to the App Dev Club Portal."
            })

            setTimeout(() => {
                setIsLoading(false)
                navigate("/")
            }, 1000)
        }).catch(() => {
            setIsLoading(false)
            toast.error("Onboarding Failed!", {
                description: "Please contact your team's leadership for assistance. Futher information can be found in your invite email."
            })
        })
    }

    const [personalInfoProps, setPersonalInfoProps] = React.useState({
        stepComplete: handlePersonalInfoComplete
    })

    const [passwordStageProps, setPasswordStageProps] = React.useState({
        name: "Loading",
        email: "Loading",
        teamName: "Loading",
        role: "Loading",
        stepComplete: handlePasswordSetupComplete
    })

    const [slackJoinProps, setSlackJoinProps] = React.useState({
        email: "Loading",
        slackInviteLink: '#',
        stepComplete: handleSlackJoinComplete
    })

    React.useEffect(() => {
        /* Fetch the Onboarding Information using UUID */
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/invites/${params.onboardId}`)
            .then(async (res) => {
                if (res.status != 200)
                    throw new Error(res.statusText)

                const inviteData = await res.json() as APIInviteInfo
                setInviteInfo(inviteData)
                setPasswordStageProps((existingProps) => ({
                    ...existingProps,
                    name: inviteData.inviteName,
                    email: inviteData.inviteEmail,
                    role: inviteData.roleTitle,
                    teamName: inviteData.teamName
                }))

                setSlackJoinProps((existingProps) => ({
                    ...existingProps,
                    email: inviteData.inviteEmail,
                    slackInviteLink: inviteData.slackInviteLink
                }))
            })

            .catch(() => {
                toast.error("Failed to Fetch Invite Info!", {
                    description: `Please check if the Invite Link is Valid!`
                })
            })
    }, [])

    return (
        <div className="flex flex-col w-full h-full">
            { /* Minimal, Special Header for Onboarding Page */}
            <header className="flex w-full h-14 shrink-0 items-center gap-2 border-b px-4">
                <img className='h-8' src={logo} />
                <h1>Onboarding Portal</h1>
            </header>

            { /* Add Stages Here */}
            <div style={{ height: "calc(100% - calc(var(--spacing) * 12))" }} className='flex flex-col w-full justify-center items-center'>
                <SidebarProvider className='items-start h-full min-h-0'>
                    <Sidebar collapsible="none" className="hidden md:flex">
                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupContent style={{}}>
                                    <SidebarMenu>
                                        {
                                            ONBOARDING_FLOWLIST.map((el, index) => (
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={location.pathname.endsWith(el.path)}
                                                    >
                                                        <Link onClick={() => { currentStepRef.current = index }} to={`${basePath}/${el.path}`}>
                                                            <el.icon />
                                                            <span>{el.title}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))
                                        }
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>

                    <div className='flex flex-col items-center justify-center h-full flex-grow-1'>
                        <Routes>
                            <Route path="/" element={<Navigate to="loginsetup" />} />
                            <Route path="/loginsetup" element={<CreatePasswordStage defaultPassword={createdPasswordRef.current} {...passwordStageProps} />} />
                            <Route path='/legal' element={<ProprietaryInformationStage defaultSigned={ipAgreementComplete.current} stepComplete={handleIPAgreementComplete} />} />
                            <Route path='/slack' element={<SlackJoinStage defaultVerified={slackJoinComplete.current} {...slackJoinProps} />} />
                            <Route path='/identity' element={<PersonalInfoStage onboardId={params.onboardId} defaultData={personalInfoRef.current} {...personalInfoProps} />} />
                            <Route path='/complete' element={
                                <CompleteSetupStage
                                    isLoading={isLoading}
                                    stepComplete={handleNextStep}
                                    stages={[
                                        { name: "Password Creation", status: createdPasswordRef.current.length >= 8 },
                                        { name: "Personal Information", status: personalInfoRef.current != undefined },
                                        { name: "Intellectual Property Agreement", status: ipAgreementComplete.current },
                                        { name: "Join App Dev Slack", status: slackJoinComplete.current }
                                    ]}
                                />
                            } />
                        </Routes>
                    </div>
                </SidebarProvider>
            </div>
        </div>
    )
}

const CompleteSetupStage = (props: CompleteSetupStageProps) => {
    const [allStepsComplete, setAllComplete] = React.useState(true);

    React.useEffect(() => {
        for (const stage of props.stages) {
            if (!stage.status) {
                setAllComplete(false)
                break;
            }
        }
    }, []);

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>You're almost there!</CardTitle>
            <CardDescription className='text-center'>Please complete any incomplete items and once you're done, smash the button! 💥</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 min-w-xl flex-grow-1'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Setup Requirement</TableHead>
                            <TableHead>Completion Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {
                            props.stages.map((stage) => (
                                <TableRow>
                                    <TableCell>{stage.name}</TableCell>
                                    <TableCell>{
                                        stage.status ?
                                            <span className='flex gap-1 items-center text-green-500'><CheckCircle2Icon size="16" /> Complete</span> :
                                            <span className='flex gap-1 items-center text-red-400'><XCircleIcon size="16" /> Incomplete</span>
                                    }</TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>

                <Button
                    className='mt-5'
                    disabled={!allStepsComplete || props.isLoading}
                    onClick={props.stepComplete}
                >
                    <Loader2Icon className={cn('animate-spin', !props.isLoading && 'hidden')} />
                    Finish Setup
                </Button>
            </div>
        </div>
    )
}

const PersonalInfoStage = (props: PersonalInfoStageProps) => {
    const [preview, setPreview] = React.useState<string | null>(props.defaultData?.profileUrl ?? null);
    const [avatarKey, setAvatarKey] = React.useState<string | undefined>(props.defaultData?.avatarKey);
    const fileUploadRef = React.useRef<HTMLInputElement>(null)
    const [phoneNumber, setPhoneNumber] = React.useState(props.defaultData?.phoneNumber ?? "")
    const [selectedMajor, setSelectedMajor] = React.useState<UMDApiMajorListResponse | undefined>(props.defaultData?.major)
    const [isUploading, setIsUploading] = React.useState(false);

    const [majorListOpen, setMajorListOpen] = React.useState(false)
    const [majors, setMajors] = React.useState<UMDApiMajorListResponse[]>([])
    const [expectedGraduation, setExpectedGraduation] = React.useState(props.defaultData?.expectedGrad ?? "")

    // Cropping State
    const [cropImage, setCropImage] = React.useState<string | null>(null)
    const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = React.useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)
    const [isCroppingOpen, setIsCroppingOpen] = React.useState(false)


    React.useEffect(() => {
        fetch("https://api.umd.io/v1/majors/list")
            .then(async (res) => (await res.json()))
            .then((majors) => { setMajors(majors) })
            .catch(() => {
                toast.error("Failed to Fetch Majors", {
                    description: "Major List Fetch Failed from University of Maryland Community APIs"
                })
            })
    }, [])

    const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error("No 2d context"));
                    return;
                }

                // Set canvas size to the desired cropped size
                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;

                ctx.drawImage(
                    image,
                    pixelCrop.x,
                    pixelCrop.y,
                    pixelCrop.width,
                    pixelCrop.height,
                    0,
                    0,
                    pixelCrop.width,
                    pixelCrop.height
                );

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas is empty"));
                        return;
                    }
                    resolve(blob);
                }, 'image/webp', 0.8);
            };
            image.onerror = (error) => reject(error);
        });
    };


    const validateFileSignature = (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = (e) => {
                if (!e.target?.result || typeof e.target.result === 'string') {
                    resolve(false);
                    return;
                }

                const arr = (new Uint8Array(e.target.result)).subarray(0, 4);
                let header = "";
                for (let i = 0; i < arr.length; i++) {
                    header += arr[i].toString(16);
                }

                // Magic Numbers
                // PNG: 89 50 4E 47
                // JPEG: FF D8 FF
                // GIF: 47 49 46 38
                // WebP: 52 49 46 46 (RIFF) ... WEBP (handled loosely here by RIFF check but good enough for rough check)

                // Check hex signature
                let isValid = false;
                switch (true) {
                    case header.startsWith("89504e47"): // PNG
                    case header.startsWith("ffd8ff"):   // JPEG
                    case header.startsWith("47494638"): // GIF
                    case header.startsWith("52494646"): // RIFF (WebP mostly)
                        isValid = true;
                        break;
                    default:
                        isValid = false;
                        break;
                }
                resolve(isValid);
            };
            reader.readAsArrayBuffer(file.slice(0, 4)); // Read first 4 bytes
        });
    };

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Invalid file type", { description: "Please upload an image (JPEG, PNG, WEBP, GIF)" });
                return;
            }

            // Security: Magic Number Validation
            const isValidSignature = await validateFileSignature(file);
            if (!isValidSignature) {
                toast.error("Invalid file content", { description: "The file content does not match its extension." });
                return;
            }

            // Upfront File Size Check (Security: Prevent browser crash/hang during resize)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File is too large!", { description: "Maximum file size is 5MB" });
                return;
            }

            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImage(reader.result as string);
                setIsCroppingOpen(true);
            });
            reader.readAsDataURL(file);
        }
    }

    async function processAndUploadAvatar() {
        if (!cropImage || !croppedAreaPixels) return;

        setIsUploading(true);
        setIsCroppingOpen(false);

        try {
            const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
            const uploadFile = new File([croppedBlob], "avatar.webp", { type: "image/webp" });

            const url = URL.createObjectURL(uploadFile);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(url);

            if (!props.onboardId) {
                toast.error("Missing Onboard ID");
                setIsUploading(false);
                return;
            }

            // Get Upload URL
            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/avatar/upload-url?inviteId=${props.onboardId}&fileName=${encodeURIComponent(uploadFile.name)}&contentType=${encodeURIComponent(uploadFile.type)}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to get upload URL");
            }
            const { uploadUrl, key, fields } = await res.json();

            // Upload to S3 using Presigned POST
            const formData = new FormData();
            Object.entries(fields).forEach(([k, v]) => {
                formData.append(k, v as string);
            });
            formData.append("file", uploadFile);

            const uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                if (uploadRes.status === 403 && errorText.includes("EntityTooLarge")) {
                    throw new Error("File is too large (S3 Limit Exceeded)");
                }
                throw new Error(`Failed to upload to S3: ${uploadRes.status} ${uploadRes.statusText}`);
            }

            await new Promise(r => setTimeout(r, 1000)); // Wait a bit for S3 consistency

            setAvatarKey(key);
            toast.success("Profile picture uploaded!");
        } catch (e: any) {
            console.error(e);
            toast.error("Upload failed", { description: e.message || "Please try again later" });
            setAvatarKey(undefined); // Clear key on error
        } finally {
            setIsUploading(false);
            setCropImage(null);
        }
    }

    return (
        <div className='flex flex-col h-full w-full items-center justify-center p-12'>
            <Avatar title='Upload Profile Picture' onClick={() => fileUploadRef.current?.click()} className="size-32 rounded-full cursor-pointer">
                <AvatarImage src={preview ?? undefined} alt="Profile" />
                <AvatarFallback><UploadCloudIcon className='size-8' /></AvatarFallback>
            </Avatar>
            <p className='mt-4 mb-2'>Upload your Profile Picture</p>

            <Input
                ref={fileUploadRef}
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
            />

            <Dialog open={isCroppingOpen} onOpenChange={setIsCroppingOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Crop your Profile Picture</DialogTitle>
                    </DialogHeader>
                    <div className="relative h-[400px] w-full mt-4 bg-muted rounded-md overflow-hidden">
                        {cropImage && (
                            <Cropper
                                image={cropImage}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                            />
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 w-full">
                        <Minus
                            className="w-4 h-4 cursor-pointer hover:opacity-70"
                            onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                        />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                            className="w-[50%]"
                        />
                        <Plus
                            className="w-4 h-4 cursor-pointer hover:opacity-70"
                            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsCroppingOpen(false)}>Cancel</Button>
                        <Button onClick={processAndUploadAvatar}>Crop & Upload</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className={'grid gap-2 w-lg mt-5'}>
                <Label>What's your Major?</Label>
                <Popover open={majorListOpen} onOpenChange={setMajorListOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={majorListOpen}
                            className="justify-between max-w-full"
                        >
                            {selectedMajor
                                ? selectedMajor.name
                                : "No Major Chosen"}
                            <ChevronsUpDown className="opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] max-w-[600px] p-0">
                        <Command>
                            <CommandInput placeholder="Search UMD Major" className="h-9" />
                            <CommandList>
                                <CommandEmpty>No Majors Found</CommandEmpty>
                                <CommandGroup>
                                    {majors.map((framework) => (
                                        <CommandItem
                                            key={framework.major_id}
                                            value={framework.name}
                                            onSelect={(currentValue) => {
                                                setSelectedMajor(framework)
                                                setMajorListOpen(false)
                                            }}
                                        >
                                            <div className='flex flex-col'>
                                                <span>{framework.name}</span>
                                                <span className='text-sm text-muted-foreground'>{framework.college}</span>
                                            </div>
                                            <Check
                                                className={cn(
                                                    "ml-auto",
                                                    selectedMajor?.major_id === framework.major_id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className={'grid gap-2 w-lg mt-5'}>
                <Label>Expected Graduation</Label>
                <Input
                    type='date'
                    value={expectedGraduation}
                    onChange={(e) => setExpectedGraduation(e.target.value)}
                />
            </div>

            <div className={'grid gap-2 w-lg mt-5'}>
                <Label>Phone Number</Label>
                <PhoneInput
                    defaultCountry='US'
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(number) => setPhoneNumber(number)} />
            </div>

            <Button
                className='mt-8'
                disabled={!expectedGraduation || !selectedMajor || !phoneNumber || !preview || isUploading}
                onClick={() => props.stepComplete({
                    profileUrl: preview!,
                    avatarKey: avatarKey,
                    major: selectedMajor!,
                    expectedGrad: expectedGraduation,
                    phoneNumber: phoneNumber
                })}
            >
                <Loader2Icon className={cn('animate-spin mr-2', !isUploading && 'hidden')} />
                Continue
            </Button>
        </div>
    )
}

const SlackJoinStage = (props: SlackJoinStageProps) => {
    const [slackJoinVerified, setSlackJoinVerified] = React.useState(props.defaultVerified)
    const [isLoading, setIsLoading] = React.useState(false);

    const verifyJoinStatus = () => {
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/tools/verifyslack`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                email: props.email
            })
        }).then(async (res) => {
            if (!res.ok) {
                throw new Error(res.statusText)
            }
            const status: boolean = await res.json()
            if (status !== true)
                throw new Error("Not Joined!")

            setIsLoading(false)
            setSlackJoinVerified(true)
            props.stepComplete(true)
        }).catch(() => {
            setIsLoading(false)
            toast.error("Verification Failed!", {
                description: "We couldn't verify that you're in the App Dev Slack. Please make sure that you used the correct email address and invite link as mentioned in the instructions."
            })
        })
    }

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>Join the App Dev Slack!</CardTitle>
            <CardDescription className='text-center'>That's where all the fun stuff cooks 🥘</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 w-full flex-grow-1'>
                <Alert variant="default" className='w-lg'>
                    <TriangleAlertIcon />
                    <AlertTitle>Joining Instructions</AlertTitle>
                    <AlertDescription>
                        <span>
                            Please join App Dev's Slack Channel by
                            <a className='text-blue-500' href={props.slackInviteLink} target="_blank" rel="noopener noreferrer"> clicking this link</a>.
                            You need to use the email address <b>{props.email}</b> to create or login to slack.
                            This portal validates your slack membership status by verifing your email address.
                        </span>
                    </AlertDescription>
                </Alert>

                <Button onClick={verifyJoinStatus} disabled={isLoading}>
                    <Loader2Icon className={cn('animate-spin mr-2', !isLoading && 'hidden')} />
                    Verify and Continue
                </Button>
            </div>
        </div>
    )
}

const ProprietaryInformationStage = (props: ProprietaryInformationStageProps) => {
    const [agreementSigned, setAgreementSigned] = React.useState(props.defaultSigned);

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>Intellectual Property Agreement</CardTitle>
            <CardDescription className='text-center'>This legal agreement helps us transfer the technology that you've helped develop directly to our sponsor companies.</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 w-full flex-grow-1'>
                <iframe
                    className='w-[100%] h-[100%] rounded-md'
                    src='/IntellectualPropertyAgreement.pdf'
                    style={{
                        border: 'none'
                    }}
                />
            </div>

            <div className="flex w-full items-start gap-3 mt-5">
                <Checkbox checked={agreementSigned} id="terms" onCheckedChange={(checked) => setAgreementSigned(checked as boolean)} />
                <div className="grid flex-grow-1">
                    <Label htmlFor="terms">Accept Agreement</Label>
                    <p className="text-muted-foreground text-sm">
                        By clicking this checkbox, you agree to have signed the aforementioned Intellectual Property Agreement
                        with App Dev Club LLC.
                    </p>
                </div>

                <Button onClick={() => { props.stepComplete(agreementSigned) }} disabled={!agreementSigned}>Continue</Button>
            </div>
        </div>
    )
}

const CreatePasswordStage = (props: CreatePasswordStageProps) => {
    const [password, setPassword] = React.useState(props.defaultPassword)
    const [confirmPassword, setConfirmPassword] = React.useState(props.defaultPassword)
    const [isInputFocused, setIsInputFocused] = React.useState(false)

    const strengthResult = React.useMemo(() => zxcvbn(password), [password])
    const strengthScore = strengthResult.score
    const strengthPercentage = (strengthScore + 1) * 20

    const getStrengthColor = (score: number) => {
        switch (score) {
            case 0: return "bg-red-500"
            case 1: return "bg-orange-500"
            case 2: return "bg-yellow-500"
            case 3: return "bg-blue-500"
            case 4: return "bg-green-500"
            default: return "bg-muted"
        }
    }

    const getStrengthLabel = (score: number) => {
        switch (score) {
            case 0: return "Very Weak"
            case 1: return "Weak"
            case 2: return "Fair"
            case 3: return "Strong"
            case 4: return "Very Strong"
            default: return ""
        }
    }

    const passwordRequirements = [
        { name: "Minimum 12 characters", status: password.length >= 12 },
        { name: "Fair password strength", status: strengthScore >= 2 },
        { name: "Passwords match", status: password === confirmPassword && password.length > 0 }
    ]

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>Welcome to the {ORGANIZATION_NAME}!</CardTitle>
            <CardDescription>Please Follow the Onboarding Process</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 w-full'>
                <Alert variant="default" className='w-lg'>
                    <TriangleAlertIcon />
                    <AlertTitle>Confirm Your Information</AlertTitle>
                    <AlertDescription>
                        Hello {props.name}! You will need an App Dev Club account to access internal repositories, resources and people portals. Your login email will be {props.email}.
                        Please confirm that you'll be joining the App Dev's {props.teamName} team as a {props.role}.
                    </AlertDescription>
                </Alert>

                {/* Get Password! */}
                <div className={'grid gap-2 w-lg mt-5'}>
                    <Label htmlFor="password">Create New Password</Label>
                    <Popover open={password.length > 0 && isInputFocused}>
                        <PopoverTrigger asChild>
                            <Input
                                id="password"
                                type='password'
                                value={password}
                                placeholder='Minimum 12 characters'
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-80 p-3"
                            align="start"
                            side="bottom"
                            sideOffset={10}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold">Password Strength</span>
                                        <span className={cn("text-xs font-bold", getStrengthColor(strengthScore).replace('bg-', 'text-'))}>
                                            {getStrengthLabel(strengthScore)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={strengthPercentage}
                                        className="h-1.5"
                                        indicatorClassName={getStrengthColor(strengthScore)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Requirements</p>
                                    {passwordRequirements.filter(req => req.name !== "Passwords match").map((req, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            {req.status ? (
                                                <CheckCircle2Icon className="h-3.5 w-3.5 text-green-500" />
                                            ) : (
                                                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                                            )}
                                            <span className={cn("text-xs", req.status ? "text-foreground" : "text-muted-foreground")}>
                                                {req.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className={'grid gap-2 w-lg'}>
                    <Label htmlFor="cnfpassword">Confirm Password</Label>
                    <Input
                        id="cnfpassword"
                        type='password'
                        value={confirmPassword}
                        placeholder='Confirm your Password'
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            {password === confirmPassword ? (
                                <>
                                    <CheckCircle2Icon className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-xs text-green-600 font-medium">Passwords match</span>
                                </>
                            ) : (
                                <>
                                    <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-xs text-red-500 font-medium">Passwords do not match</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Next Step Stuff */}
            <Button
                disabled={password.length < 12 || password != confirmPassword || strengthScore < 2} className='mt-8'
                onClick={() => { props.stepComplete(password) }}
            >
                Continue Account Setup
            </Button>
        </div>
    )
}