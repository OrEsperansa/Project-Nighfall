{{- define "nightfall.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "nightfall.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "nightfall.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "nightfall.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "nightfall.studentName" -}}
{{- printf "student-%d" . -}}
{{- end }}

{{- define "nightfall.studentResourceName" -}}
{{- $root := index . 0 -}}
{{- $number := index . 1 -}}
{{- printf "%s-student-%d" (include "nightfall.fullname" $root) $number | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "nightfall.studentRouteName" -}}
{{- $root := index . 0 -}}
{{- $number := index . 1 -}}
{{- $studentName := include "nightfall.studentName" $number -}}
{{- $suffix := printf "%s:%s:%s:route" $root.Release.Name $root.Values.auth.tokenSeed $studentName | sha256sum | trunc 12 -}}
{{- printf "%s-%s" $studentName $suffix -}}
{{- end }}
