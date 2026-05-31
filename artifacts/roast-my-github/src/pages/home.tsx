import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Terminal, Github, Code, GitMerge, Skull } from "lucide-react";
import { useGenerateRoast } from "@workspace/api-client-react";
import type { RoastInputStyle } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  username: z.string().min(1, {
    message: "We need a name to roast.",
  }),
  style: z.enum(["Normal", "Corporate Jargon", "Pirate", "Haiku"] as const, {
    required_error: "Pick a poison.",
  }),
});

export default function Home() {
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastData, setRoastData] = useState<{
    roast: string;
    username: string;
    repoCount?: number | null;
    topLanguages?: string[];
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      style: "Normal",
    },
  });

  const roastMutation = useGenerateRoast();

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsRoasting(true);
    setRoastData(null);
    roastMutation.mutate(
      {
        data: {
          username: values.username,
          style: values.style as RoastInputStyle,
        },
      },
      {
        onSuccess: (data) => {
          setRoastData(data);
          setIsRoasting(false);
        },
        onError: () => {
          setIsRoasting(false);
        },
      }
    );
  }

  function handleRoastAgain() {
    setRoastData(null);
    form.reset();
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono selection:bg-primary selection:text-primary-foreground">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary rounded-full blur-[128px]" />
      </div>

      <div className="z-10 w-full max-w-2xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-secondary rounded-xl mb-4 border border-border shadow-xl">
            <Skull className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white uppercase drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]">
            Roast My GitHub
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-lg mx-auto">
            Input a username. Get destroyed by a machine that writes better code than you.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="relative">
          {!roastData && !isRoasting && !roastMutation.isError && (
            <Card className="border-border bg-card/50 backdrop-blur-sm shadow-2xl">
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative group">
                                <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                  placeholder="torvalds"
                                  data-testid="input-username"
                                  className="pl-12 h-14 bg-background border-border text-lg focus-visible:ring-primary focus-visible:border-primary transition-all rounded-none"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-destructive font-mono text-sm mt-2" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="style"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  data-testid="select-style"
                                  className="h-14 bg-background border-border text-lg focus:ring-primary rounded-none"
                                >
                                  <SelectValue placeholder="Select roast style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-card border-border rounded-none">
                                <SelectItem value="Normal" className="focus:bg-secondary focus:text-primary rounded-none text-base py-3">Normal</SelectItem>
                                <SelectItem value="Corporate Jargon" className="focus:bg-secondary focus:text-primary rounded-none text-base py-3">Corporate Jargon</SelectItem>
                                <SelectItem value="Pirate" className="focus:bg-secondary focus:text-primary rounded-none text-base py-3">Pirate</SelectItem>
                                <SelectItem value="Haiku" className="focus:bg-secondary focus:text-primary rounded-none text-base py-3">Haiku</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      data-testid="button-roast"
                      className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-none uppercase tracking-widest"
                    >
                      Roast Me
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {isRoasting && (
            <div className="py-20 flex flex-col items-center justify-center space-y-6 animate-pulse">
              <Terminal className="w-12 h-12 text-primary animate-bounce" />
              <div className="space-y-2 text-center">
                <p className="text-xl text-primary font-bold">ANALYZING SPAGHETTI CODE...</p>
                <p className="text-muted-foreground text-sm">Cloning repos. Judging commit messages. Weeping silently.</p>
              </div>
            </div>
          )}

          {roastMutation.isError && !isRoasting && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-8 text-center space-y-6">
                <div className="inline-flex p-4 rounded-full bg-destructive/20 text-destructive mb-2">
                  <Skull className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-destructive">404: TALENT NOT FOUND</h3>
                  <p className="text-muted-foreground">
                    {roastMutation.error?.error || "GitHub says this user doesn't exist. Sounds about right."}
                  </p>
                </div>
                <Button 
                  onClick={() => roastMutation.reset()}
                  variant="outline"
                  className="mt-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none"
                >
                  Try a Real Developer
                </Button>
              </CardContent>
            </Card>
          )}

          {roastData && !isRoasting && (
            <Card className="border-primary/50 bg-card/80 backdrop-blur-md shadow-[0_0_30px_rgba(20,184,166,0.15)] animate-in zoom-in-95 duration-500 rounded-none">
              <CardContent className="p-8 md:p-12 space-y-8">
                <div className="flex flex-col md:flex-row gap-6 items-start justify-between border-b border-border pb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">@{roastData.username}</h2>
                    <p className="text-primary font-mono text-sm flex items-center gap-2">
                      <Code className="w-4 h-4" /> Subject Acquired
                    </p>
                  </div>
                  
                  <div 
                    className="flex flex-wrap gap-4 text-sm text-muted-foreground"
                    data-testid="text-stats"
                  >
                    {roastData.repoCount !== undefined && roastData.repoCount !== null && (
                      <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 border border-border">
                        <GitMerge className="w-4 h-4 text-primary" />
                        <span>{roastData.repoCount} Repos</span>
                      </div>
                    )}
                    {roastData.topLanguages && roastData.topLanguages.length > 0 && (
                      <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 border border-border">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span>{roastData.topLanguages.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  data-testid="text-roast"
                  className="text-lg md:text-xl leading-relaxed text-gray-300 font-serif italic border-l-4 border-primary pl-6"
                >
                  "{roastData.roast}"
                </div>

                <div className="pt-6">
                  <Button 
                    onClick={handleRoastAgain}
                    data-testid="button-roast-again"
                    className="w-full md:w-auto h-12 px-8 font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-all rounded-none uppercase tracking-wider hover:border-primary/50"
                  >
                    Roast Someone Else
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
